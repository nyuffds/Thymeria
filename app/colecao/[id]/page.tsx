export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { CardDetailWithSell } from "./_components/CardDetailWithSell";

const prisma = new PrismaClient();

export default async function ColecaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const { id } = await params;

  const [user, settings] = await Promise.all([
    prisma.user.findUnique({ where: { username: session.user.name } }),
    prisma.gameSettings.upsert({
      where:  { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    }),
  ]);
  if (!user) redirect("/login");

  const [card, entry] = await Promise.all([
    prisma.card.findUnique({
      where: { id },
      include: { faction: true, ability: true },
    }),
    prisma.userCollection.findUnique({
      where: { userId_cardId: { userId: user.id, cardId: id } },
    }),
  ]);

  if (!card) notFound();
  if (!entry || entry.quantity < 1) redirect("/colecao");

  const defaultByRarity: Record<string, number> = {
    COMMON:    settings.sellPriceCommon,
    RARE:      settings.sellPriceRare,
    EPIC:      settings.sellPriceEpic,
    LEGENDARY: settings.sellPriceLegendary,
  };
  const unitPrice = card.sellPriceOverride ?? defaultByRarity[card.rarity] ?? 0;

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
          href="/colecao"
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
          &larr; Tesouraria
        </Link>

        <div style={{ background: "rgba(20,12,4,0.5)", border: "1px solid #3d3022", borderRadius: 6, padding: 24 }}>
          <CardDetailWithSell
            card={{
              id: card.id,
              name: card.name,
              power: card.power,
              rows: card.rows,
              rarity: card.rarity,
              cardType: card.cardType,
              loreText: card.loreText,
              imageUrl: card.imageUrl,
              frameUrl: card.frameUrl,
              faction: { name: card.faction.name, color: card.faction.color },
              ability: card.ability
                ? { name: card.ability.name, description: card.ability.description }
                : null,
            }}
            quantity={entry.quantity}
            unitPrice={unitPrice}
            allowSellLastCopy={settings.allowSellLastCopy}
          />
        </div>

      </div>
    </main>
  );
}
