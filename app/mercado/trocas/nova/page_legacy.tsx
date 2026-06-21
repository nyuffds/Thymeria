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

  // Cartas que tenho (para oferecer)
  const myCards = await prisma.userCollection.findMany({
    where: { userId: me.id, quantity: { gt: 0 } },
    include: { card: { include: { faction: true } } },
    orderBy: { card: { name: "asc" } },
  });

  // Todas as cartas (para demandar)
  const allCards = await prisma.card.findMany({
    where: { isReleased: true },
    include: { faction: true },
    orderBy: { name: "asc" },
  });

  // Outros jogadores (para oferta direcionada)
  const players = await prisma.user.findMany({
    where: { NOT: { id: me.id } },
    select: { id: true, username: true },
    orderBy: { username: "asc" },
  });

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
      <nav className="mb-4 flex items-center gap-3 text-sm">
        <Link href="/mercado/trocas" className="text-zinc-500 hover:text-amber-200 transition">{"\u2190 Trocas"}</Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-3xl font-bold text-amber-200 font-heading">Nova oferta de troca</h1>
        <p className="text-sm text-zinc-400 mt-1 font-lore italic">
          Monte sua oferta: cartas e/ou moedas em troca de cartas e/ou moedas.
        </p>
      </header>

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
    </main>
  );
}