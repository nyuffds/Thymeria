export const dynamic = "force-dynamic";

// app/cartas/page.tsx
// Catalogo publico de cartas liberadas.
// Jogadores veem apenas cartas que possuem na colecao. Admin ve tudo.

import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";
import { CardsCatalog } from "./_components/CardsCatalog";

const prisma = new PrismaClient();

export default async function CartasPublicPage() {
  const session = await auth();

  const user = session?.user?.name
    ? await prisma.user.findUnique({
        where: { username: session.user.name },
        select: { id: true, role: true },
      })
    : null;

  const isAdmin = user?.role === "ADMIN";

  let ownedCardIds: Set<string> | null = null;
  if (user && !isAdmin) {
    const collection = await prisma.userCollection.findMany({
      where: { userId: user.id },
      select: { cardId: true },
    });
    ownedCardIds = new Set(collection.map((c) => c.cardId));
  }

  const settings = await prisma.gameSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const [cards, factions] = await Promise.all([
    prisma.card.findMany({
      where: {
        isReleased: true,
        ...(ownedCardIds ? { id: { in: Array.from(ownedCardIds) } } : {}),
      },
      orderBy: [{ faction: { name: "asc" } }, { name: "asc" }],
      include: { faction: true, ability: true },
    }),
    prisma.faction.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
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
            BESTIARIO
          </h1>
          <p style={{ margin: "16px auto 0", fontFamily: "var(--font-cormorant), Georgia, serif", fontStyle: "italic", color: "#d3c89a", fontSize: 16, maxWidth: 600, lineHeight: 1.5, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
            &ldquo;{isAdmin
              ? "As reliquias e personagens de Thymeria. Visao do Conselho: todas as cartas."
              : "As reliquias e personagens que voce ja descobriu em Thymeria."}&rdquo;
          </p>

          {!isAdmin && cards.length === 0 && (
            <p style={{
              margin: "16px auto 0",
              padding: "10px 16px",
              maxWidth: 460,
              background: "rgba(183,110,95,0.15)",
              border: "1px solid #5a2818",
              borderRadius: 4,
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontStyle: "italic",
              fontSize: 13,
              color: "#d3a89a",
            }}>
              Sua colecao esta vazia. Abra boosters na <a href="/loja" style={{ color: "#c9a961" }}>Mercado do Eitri</a> pra descobrir cartas.
            </p>
          )}
        </div>

        <CardsCatalog
          cards={cards.map((c) => ({
            id: c.id,
            name: c.name,
            power: c.power,
            rows: c.rows,
            rarity: c.rarity,
            cardType: c.cardType,
            loreText: c.loreText,
            imageUrl: c.imageUrl,
            frameUrl: c.frameUrl,
            faction: { name: c.faction.name, color: c.faction.color },
            ability: c.ability
              ? { name: c.ability.name, description: c.ability.description }
              : null,
          }))}
          factions={factions}
        />
      </div>
    </main>
  );
}
