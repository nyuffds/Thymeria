// app/cartas/page.tsx
// Catálogo público de cartas liberadas.
// Jogadores veem apenas cartas que possuem na coleção. Admin vê tudo.

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
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-amber-200 font-heading">Catálogo de Cartas</h1>
        <p className="text-sm text-zinc-400 mt-1 font-lore italic">
          {isAdmin
            ? "As relíquias e personagens de Thymeria — visão admin (todas as cartas)."
            : "As relíquias e personagens que você descobriu em Thymeria."}
        </p>
        {!isAdmin && cards.length === 0 && (
          <p className="text-sm text-amber-400 mt-3 italic">
            Sua coleção está vazia. Abra boosters na loja pra descobrir cartas.
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
          faction: { name: c.faction.name, color: c.faction.color },
          ability: c.ability
            ? { name: c.ability.name, description: c.ability.description }
            : null,
        }))}
        factions={factions}
      />
    </main>
  );
}
