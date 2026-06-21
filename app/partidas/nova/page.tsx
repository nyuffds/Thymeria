export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { NewHotseatForm } from "./_components/NewHotseatForm";

const prisma = new PrismaClient();

export default async function NovaPartidaPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true, role: true },
  });
  if (!me) redirect("/login");

  const settings = await prisma.gameSettings.upsert({
    where: { id: "singleton" }, update: {}, create: { id: "singleton" },
  });

  const allDecks = await prisma.deck.findMany({
    where: me.role === "ADMIN"
      ? { archivedAt: null }
      : { archivedAt: null, userId: me.id },
    orderBy: [{ user: { username: "asc" } }, { name: "asc" }],
    include: {
      user:    { select: { id: true, username: true } },
      faction: true,
      _count:  { select: { cards: true } },
      leader:  { include: { card: true } },
    },
  });

  const playable = allDecks
    .filter((d) => d.leader)
    .filter((d) => d._count.cards >= settings.minCardsPerDeck)
    .filter((d) => d._count.cards <= settings.maxCardsPerDeck)
    .map((d) => ({
      id: d.id,
      name: d.name,
      userId: d.user.id,
      username: d.user.username,
      faction: { name: d.faction.name, color: d.faction.color },
      cardCount: d._count.cards,
      leaderName: d.leader!.card.name,
    }));

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

      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "40px 32px 60px", width: "100%" }}>

        {/* Nav voltar */}
        <Link
          href="/partidas"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-cinzel), Georgia, serif",
            fontSize: 11,
            color: "#8b6f3a",
            textDecoration: "none",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          &larr; Partidas
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <p style={{ margin: "0 0 10px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#8b6f3a", textTransform: "uppercase", letterSpacing: "0.5em" }}>
            &mdash; Hot-Seat &mdash;
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: 48,
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
            NOVA PARTIDA
          </h1>
          <p style={{ margin: "16px auto 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", color: "#d3c89a", fontSize: 16, maxWidth: 580, lineHeight: 1.5, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
            &ldquo;Dois aventureiros, um tabuleiro. Os decks se enfrentam na mesma maquina.&rdquo;
          </p>
        </div>

        {playable.length < 2 ? (
          <div style={{ background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 6, padding: "40px 24px", textAlign: "center" }}>
            <p style={{ margin: "0 0 8px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 14, color: "#8b6f3a", letterSpacing: "0.1em" }}>
              Forjas insuficientes
            </p>
            <p style={{ margin: "0 0 14px", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 14, color: "#d3c89a", lineHeight: 1.6 }}>
              Sao precisos ao menos 2 decks jogaveis ({settings.minCardsPerDeck}–{settings.maxCardsPerDeck} cartas, com lider).
            </p>
            <p style={{ margin: "0 0 18px", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#5f5340" }}>
              Decks validos no momento: <span style={{ fontFamily: "monospace", color: "#c9a961", fontWeight: 700 }}>{playable.length}</span>
            </p>
            <Link
              href="/decks"
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
              IR PARA A FORJA
            </Link>
          </div>
        ) : (
          <div style={{ background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 6, padding: 24 }}>
            <NewHotseatForm decks={playable} />
          </div>
        )}

      </div>
    </main>
  );
}
