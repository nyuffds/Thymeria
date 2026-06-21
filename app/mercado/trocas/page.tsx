export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { TrocasList } from "./_components/TrocasList";

const prisma = new PrismaClient();

export default async function TrocasPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true, coins: true },
  });
  if (!me) redirect("/login");

  const settings = await prisma.gameSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const offers = await prisma.tradeOffer.findMany({
    where: {
      status: "PENDING",
      OR: [{ targetUserId: null }, { targetUserId: me.id }],
      NOT: { creatorUserId: me.id },
    },
    orderBy: { createdAt: "desc" },
    include: {
      creator: { select: { username: true } },
      offered:  { include: { card: { include: { faction: true } } } },
      demanded: { include: { card: { include: { faction: true } } } },
    },
    take: 100,
  });

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

        <Link
          href="/mercado"
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
          &larr; Bolsa
        </Link>

        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <p style={{ margin: "0 0 10px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#8b6f3a", textTransform: "uppercase", letterSpacing: "0.5em" }}>
            &mdash; A Bolsa &mdash;
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
            TROCAS
          </h1>
          <p style={{ margin: "16px auto 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", color: "#d3c89a", fontSize: 16, maxWidth: 600, lineHeight: 1.5, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
            &ldquo;Ofertas publicas ou direcionadas a voce. Aceite, ignore, ou faca sua propria proposta.&rdquo;
          </p>
        </div>

        {/* Acoes */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, padding: "14px 20px", background: "rgba(20,12,4,0.6)", border: "1px solid #5a3f1a", borderRadius: 4, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#8b6f3a", textTransform: "uppercase", letterSpacing: "0.3em" }}>
              Patrimonio
            </span>
            <p style={{ margin: 0, fontFamily: "monospace", fontSize: 22, color: "#fcd34d", fontWeight: 700, lineHeight: 1, textShadow: "0 0 12px rgba(252,211,77,0.4)" }}>
              ✨ {me.coins.toLocaleString("pt-BR")}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              href="/mercado/trocas/minhas"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "8px 14px",
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
              Minhas Ofertas
            </Link>
            <Link
              href="/mercado/trocas/nova"
              style={{
                display: "inline-block",
                padding: "8px 18px",
                background: "linear-gradient(180deg, #c9a961, #8b6f3a)",
                color: "#1a0f05",
                fontFamily: "var(--font-cinzel), Georgia, serif",
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: "0.2em",
                textDecoration: "none",
                borderRadius: 4,
                boxShadow: "0 4px 16px rgba(201,169,97,0.4)",
              }}
            >
              + CRIAR OFERTA
            </Link>
          </div>
        </div>

        {offers.length === 0 ? (
          <div style={{ background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 6, padding: "48px 20px", textAlign: "center" }}>
            <p style={{ margin: "0 0 8px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 14, color: "#8b6f3a", letterSpacing: "0.1em" }}>
              Sem ofertas
            </p>
            <p style={{ margin: 0, fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#5f5340" }}>
              Nenhuma oferta de troca disponivel para voce no momento.
            </p>
          </div>
        ) : (
          <TrocasList
            offers={offers.map((o) => ({
              id: o.id,
              creatorName: o.creator.username,
              isTargeted: o.targetUserId === me.id,
              createdAt: o.createdAt.toISOString(),
              offered: o.offered.map((e) => ({
                quantity: e.quantity,
                cardName: e.card.name,
                cardImageUrl: e.card.imageUrl,
                rarity: e.card.rarity,
                factionName: e.card.faction.name,
                factionColor: e.card.faction.color,
              })),
              demanded: o.demanded.map((e) => ({
                quantity: e.quantity,
                cardName: e.card.name,
                cardImageUrl: e.card.imageUrl,
                rarity: e.card.rarity,
                factionName: e.card.faction.name,
                factionColor: e.card.faction.color,
              })),
              coinsOffered: o.coinsOffered,
              coinsDemanded: o.coinsDemanded,
              note: o.note,
            }))}
            factions={Array.from(new Set(
              offers.flatMap((o) => [...o.offered, ...o.demanded].map((e) => e.card.faction.name))
            )).sort()}
            myCoins={me.coins}
          />
        )}

      </div>
    </main>
  );
}
