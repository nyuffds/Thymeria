export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { TradeOfferForm } from "../_components/TradeOfferForm";

const prisma = new PrismaClient();

export default async function NovaOfertaPage() {
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

  const [myCards, allCards, players] = await Promise.all([
    prisma.userCollection.findMany({
      where: { userId: me.id, quantity: { gt: 0 } },
      include: { card: { include: { faction: true } } },
      orderBy: { card: { name: "asc" } },
    }),
    prisma.card.findMany({
      where: { isReleased: true },
      include: { faction: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { NOT: { id: me.id } },
      select: { id: true, username: true },
      orderBy: { username: "asc" },
    }),
  ]);

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

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "40px 32px 60px", width: "100%" }}>

        <Link
          href="/mercado/trocas"
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
          &larr; Trocas
        </Link>

        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <p style={{ margin: "0 0 10px", fontFamily: "var(--font-cinzel), Georgia, serif", fontSize: 10, color: "#8b6f3a", textTransform: "uppercase", letterSpacing: "0.5em" }}>
            &mdash; A Bolsa &mdash;
          </p>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-cinzel), Georgia, serif",
              fontSize: 44,
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
            NOVA OFERTA
          </h1>
          <p style={{ margin: "16px auto 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", color: "#d3c89a", fontSize: 16, maxWidth: 620, lineHeight: 1.5, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
            &ldquo;Monte sua oferta: cartas e/ou moedas em troca de cartas e/ou moedas.&rdquo;
          </p>
        </div>

        <div style={{ background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 6, padding: 24 }}>
          <TradeOfferForm
            myCards={myCards.map((c) => ({
              cardId: c.cardId,
              name: c.card.name,
              quantity: c.quantity,
              rarity: c.card.rarity,
              factionName: c.card.faction.name,
              factionColor: c.card.faction.color,
              imageUrl: c.card.imageUrl,
            }))}
            allCards={allCards.map((c) => ({
              cardId: c.id,
              name: c.name,
              rarity: c.rarity,
              factionName: c.faction.name,
              factionColor: c.faction.color,
              imageUrl: c.imageUrl,
            }))}
            players={players}
            myCoins={me.coins}
          />
        </div>

      </div>
    </main>
  );
}
