export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { DecksList } from "./_components/DecksList";

const prisma = new PrismaClient();

export default async function DecksPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) redirect("/login");

  const [decks, settings] = await Promise.all([
    prisma.deck.findMany({
      where: { userId: user.id, archivedAt: null },
      orderBy: { updatedAt: "desc" },
      include: {
        faction: true,
        leader:  { include: { card: true } },
        _count:  { select: { cards: true } },
      },
    }),
    prisma.gameSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    }),
  ]);

  const atLimit = decks.length >= settings.maxDecksPerPlayer;

  return (
    <main
      style={{
        flex: 1,
        position: "relative",
        minHeight: "100vh",
        color: "#e9d9b6",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {settings.landingBackgroundUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage: `url(${settings.landingBackgroundUrl})`,
            backgroundSize: "contain",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
            backgroundColor: "#0a0805",
            backgroundAttachment: "fixed",
            opacity: 0.5,
            zIndex: 0,
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "linear-gradient(180deg, rgba(10,8,5,0.45) 0%, rgba(10,8,5,0.75) 70%, rgba(10,8,5,0.9) 100%)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "40px 32px 60px", width: "100%" }}>

        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <p style={{ margin: "0 0 10px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#8b6f3a", textTransform: "uppercase", letterSpacing: "0.5em" }}>
            &mdash; Cronica I &middot; Idade do Pacto &mdash;
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: 52,
              fontWeight: 700,
              letterSpacing: "0.15em",
              textIndent: "0.15em",
              lineHeight: 1,
              background: "linear-gradient(180deg, #fef3c7 0%, #c9a961 50%, #6a4a20 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 4px 16px rgba(201,169,97,0.4))",
            }}
          >
            FORJA DE ESTRATEGIAS
          </h1>
          <p style={{ margin: "16px auto 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", color: "#d3c89a", fontSize: 16, maxWidth: 600, lineHeight: 1.5, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
            &ldquo;Cada carta escolhida e uma promessa de vitoria.&rdquo;
          </p>

          {/* Stats */}
          <div style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 28, padding: "12px 28px", background: "rgba(20,12,4,0.6)", border: "1px solid #5a3f1a", borderRadius: 4 }}>
            <Stat value={String(decks.length)} total={String(settings.maxDecksPerPlayer)} label="Decks" color="#8e44ad" />
            <span style={{ width: 1, height: 28, background: "#3d3022" }} />
            <Stat value={`${settings.minCardsPerDeck}–${settings.maxCardsPerDeck}`} label="Cartas/deck" color="#c9a961" />
          </div>
        </div>

        {/* CTA */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          {!atLimit ? (
            <Link
              href="/decks/novo"
              style={{
                display: "inline-block",
                padding: "10px 22px",
                background: "linear-gradient(180deg, #c9a961, #8b6f3a)",
                color: "#1a0f05",
                fontFamily: "var(--font-cinzel), Georgia, serif",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.2em",
                textDecoration: "none",
                borderRadius: 4,
                boxShadow: "0 4px 16px rgba(201,169,97,0.4)",
              }}
            >
              + FORJAR DECK
            </Link>
          ) : (
            <p style={{ margin: 0, padding: "8px 16px", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 12, color: "#8b6f3a", background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 4 }}>
              Limite de decks atingido
            </p>
          )}
        </div>

        {decks.length === 0 ? (
          <div style={{ background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 6, padding: "48px 20px", textAlign: "center" }}>
            <p style={{ margin: "0 0 16px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 14, color: "#8b6f3a", letterSpacing: "0.1em" }}>
              A forja esta fria
            </p>
            <p style={{ margin: "0 0 20px", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#5f5340" }}>
              Voce ainda nao forjou nenhum deck.
            </p>
            <Link
              href="/decks/novo"
              style={{
                display: "inline-block",
                padding: "10px 22px",
                background: "linear-gradient(180deg, #c9a961, #8b6f3a)",
                color: "#1a0f05",
                fontFamily: "var(--font-cinzel), Georgia, serif",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.2em",
                textDecoration: "none",
                borderRadius: 4,
              }}
            >
              FORJAR PRIMEIRO DECK
            </Link>
          </div>
        ) : (
          <DecksList
            decks={decks.map((d) => ({
              id: d.id,
              name: d.name,
              faction: { name: d.faction.name, color: d.faction.color },
              cardCount: d._count.cards,
              leader: d.leader
                ? { name: d.leader.card.name, imageUrl: d.leader.card.imageUrl }
                : null,
              updatedAt: d.updatedAt.toISOString(),
              isValid:
                d._count.cards >= settings.minCardsPerDeck &&
                d._count.cards <= settings.maxCardsPerDeck,
              minCards: settings.minCardsPerDeck,
              maxCards: settings.maxCardsPerDeck,
            }))}
          />
        )}

      </div>
    </main>
  );
}

function Stat({ value, total, label, color }: { value: string; total?: string; label: string; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ margin: 0, fontFamily: "monospace", fontSize: 22, color, fontWeight: 700, lineHeight: 1 }}>
        {value}
        {total && <span style={{ color: "#5f5340", fontSize: 14 }}>/{total}</span>}
      </p>
      <p style={{ margin: "4px 0 0", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 9, color: "#8b6f3a", textTransform: "uppercase", letterSpacing: "0.2em" }}>
        {label}
      </p>
    </div>
  );
}
