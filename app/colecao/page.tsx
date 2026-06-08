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

  const [entries, factions, totalCardsLiberadas] = await Promise.all([
    prisma.userCollection.findMany({
      where: { userId: user.id, quantity: { gt: 0 } },
      orderBy: [{ card: { faction: { name: "asc" } } }, { card: { name: "asc" } }],
      include: {
        card: {
          include: { faction: true, ability: true },
        },
      },
    }),
    prisma.faction.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.card.count({ where: { isReleased: true } }),
  ]);

  const uniqueCount = entries.length;
  const totalCopies = entries.reduce((s, e) => s + e.quantity, 0);

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-amber-200 font-heading">Minha coleÃ§Ã£o</h1>
          <p className="text-sm text-zinc-400 mt-1 font-lore italic">
            {uniqueCount} de {totalCardsLiberadas} cartas Ãºnicas Â· {totalCopies} cÃ³pias no total
          </p>
        </div>
        <Link href="/loja" className="text-sm text-amber-300 hover:text-amber-200">
          â†’ Loja
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
          <p className="mb-4">Sua coleÃ§Ã£o estÃ¡ vazia.</p>
          <Link href="/loja" className="text-amber-300 hover:text-amber-200 underline">
            Comprar boosters â†’
          </Link>
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
    </main>
  );
}