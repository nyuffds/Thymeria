// app/cartas/page.tsx
// Catálogo público de cartas liberadas.

import { PrismaClient } from "@prisma/client";
import { CardsCatalog } from "./_components/CardsCatalog";

const prisma = new PrismaClient();

export default async function CartasPublicPage() {
  const [cards, factions] = await Promise.all([
    prisma.card.findMany({
      where: { isReleased: true },
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
          As relíquias e personagens de Thymeria.
        </p>
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