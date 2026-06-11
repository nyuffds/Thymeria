export const dynamic = "force-dynamic";

// app/admin/cartas/page.tsx
// Grade visual de todas as cartas com filtros e botões de Editar/Deletar.

import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { AdminCardsCatalog } from "./_components/AdminCardsCatalog";

const prisma = new PrismaClient();

export default async function CartasListPage() {
  const [cards, factions] = await Promise.all([
    prisma.card.findMany({
      orderBy: [{ faction: { name: "asc" } }, { name: "asc" }],
      include: { faction: true, ability: true },
    }),
    prisma.faction.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const mappedCards = cards.map((c) => ({
    id: c.id,
    name: c.name,
    power: c.power,
    rows: c.rows,
    rarity: c.rarity,
    cardType: c.cardType,
    isElite: c.isElite,
    isReleased: c.isReleased,
    loreText: c.loreText,
    imageUrl: c.imageUrl,
    frameUrl: c.frameUrl,
    faction: { name: c.faction.name, color: c.faction.color },
    ability: c.ability
      ? { name: c.ability.name, description: c.ability.description }
      : null,
  }));

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin" className="text-sm text-zinc-500 hover:text-amber-200">
            ← Painel
          </Link>
          <h1 className="text-3xl font-bold text-amber-200 mt-1 font-heading">Cartas</h1>
        </div>
        <Link
          href="/admin/cartas/nova"
          className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition"
        >
          + Nova Carta
        </Link>
      </div>

      {cards.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
          <p className="mb-4">Nenhuma carta cadastrada ainda.</p>
          <Link
            href="/admin/cartas/nova"
            className="text-amber-300 hover:text-amber-200 underline"
          >
            Criar a primeira →
          </Link>
        </div>
      ) : (
        <AdminCardsCatalog cards={mappedCards} factions={factions} />
      )}
    </main>
  );
}