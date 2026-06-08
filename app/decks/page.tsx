export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { DecksList } from "./_components/DecksList";

const prisma = new PrismaClient();

export default async function DecksPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) redirect("/login");

  const [decks, settings] = await Promise.all([
    prisma.deck.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        faction: true,
        leader:  { include: { card: true } },
        _count:  { select: { cards: true } },
      },
    }),
    prisma.gameSettings.upsert({
      where:  { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    }),
  ]);

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-amber-200 font-heading">Meus decks</h1>
          <p className="text-sm text-zinc-400 mt-1 font-lore italic">
            {decks.length} de {settings.maxDecksPerPlayer} decks · {settings.minCardsPerDeck}–{settings.maxCardsPerDeck} cartas por deck
          </p>
        </div>

        {decks.length < settings.maxDecksPerPlayer ? (
          <Link
            href="/decks/novo"
            className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition"
          >
            + Novo deck
          </Link>
        ) : (
          <span className="text-xs text-zinc-500 italic">
            Limite de decks atingido
          </span>
        )}
      </div>

      {decks.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
          <p className="mb-4">Você ainda não tem nenhum deck.</p>
          <Link href="/decks/novo" className="text-amber-300 hover:text-amber-200 underline">
            Criar primeiro deck →
          </Link>
        </div>
      ) : (
        <DecksList
          decks={decks.map((d) => ({
            id: d.id,
            name: d.name,
            faction: { name: d.faction.name, color: d.faction.color },
            cardCount: d._count.cards,
            leader: d.leader
              ? { name: d.leader.card.name, imageUrl: d.leader.card.imageUrl }
              : null,
            updatedAt: d.updatedAt.toISOString(),
            isValid:
              d._count.cards >= settings.minCardsPerDeck &&
              d._count.cards <= settings.maxCardsPerDeck,
            minCards: settings.minCardsPerDeck,
            maxCards: settings.maxCardsPerDeck,
          }))}
        />
      )}
    </main>
  );
}