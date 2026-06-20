export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { ColecaoCatalog } from "./_components/ColecaoCatalog";

const prisma = new PrismaClient();

export default async function ColecaoPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) redirect("/login");

  const settings = await prisma.gameSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const [entries, factions, totalCardsLiberadas] = await Promise.all([
    prisma.userCollection.findMany({
      where: { userId: user.id, quantity: { gt: 0 } },
      orderBy: [{ card: { faction: { name: "asc" } } }, { card: { name: "asc" } }],
      include: { card: { include: { faction: true, ability: true } } },
    }),
    prisma.faction.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.card.count({ where: { isReleased: true } }),
  ]);

  const uniqueCount = entries.length;
  const totalCopies = entries.reduce((s, e) => s + e.quantity, 0);
  const completionPct = totalCardsLiberadas > 0 ? Math.round((uniqueCount / totalCardsLiberadas) * 100) : 0;

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
            TESOURARIA
          </h1>
          <p style={{ margin: "16px auto 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", color: "#d3c89a", fontSize: 16, maxWidth: 600, lineHeight: 1.5, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
            &ldquo;Reliquias colecionadas em campanhas de gloria.&rdquo;
          </p>

          {/* Stats */}
          <div style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 28, padding: "12px 28px", background: "rgba(20,12,4,0.6)", border: "1px solid #5a3f1a", borderRadius: 4 }}>
            <Stat value={String(uniqueCount)} total={String(totalCardsLiberadas)} label="Unicas" color="#5dade2" />
            <span style={{ width: 1, height: 28, background: "#3d3022" }} />
            <Stat value={String(totalCopies)} label="Copias" color="#c9a961" />
            <span style={{ width: 1, height: 28, background: "#3d3022" }} />
            <Stat value={`${completionPct}%`} label="Completo" color="#fcd34d" />
          </div>
        </div>

        {/* CTA loja */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <Link
            href="/loja"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              border: "1px solid #5a3f1a",
              borderRadius: 4,
              color: "#c9a961",
              textDecoration: "none",
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: 11,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Ir ao Mercado &rarr;
          </Link>
        </div>

        {entries.length === 0 ? (
          <div style={{ background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 6, padding: "48px 20px", textAlign: "center" }}>
            <p style={{ margin: "0 0 8px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 14, color: "#8b6f3a", letterSpacing: "0.1em" }}>
              Tesouraria vazia
            </p>
            <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#5f5340" }}>
              Compre boosters no <Link href="/loja" style={{ color: "#c9a961" }}>Mercado do Eitri</Link> pra comecar.
            </p>
          </div>
        ) : (
          <ColecaoCatalog
            entries={entries.map((e) => ({
              cardId: e.card.id,
              quantity: e.quantity,
              card: {
                id: e.card.id,
                name: e.card.name,
                power: e.card.power,
                rows: e.card.rows,
                rarity: e.card.rarity,
                cardType: e.card.cardType,
                loreText: e.card.loreText,
                imageUrl: e.card.imageUrl,
                frameUrl: e.card.frameUrl,
                faction: { name: e.card.faction.name, color: e.card.faction.color },
                ability: e.card.ability
                  ? { name: e.card.ability.name, description: e.card.ability.description }
                  : null,
              },
            }))}
            factions={factions}
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
