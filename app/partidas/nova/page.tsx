export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { NewHotseatForm } from "./_components/NewHotseatForm";

const prisma = new PrismaClient();

export default async function NovaPartidaPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  // Carrega TODOS os decks de TODOS os jogadores que tenham tamanho válido.
  // (Hot-seat: dois jogadores escolhem na mesma tela.)
  const settings = await prisma.gameSettings.upsert({
    where: { id: "singleton" }, update: {}, create: { id: "singleton" },
  });

  const allDecks = await prisma.deck.findMany({
    orderBy: [{ user: { username: "asc" } }, { name: "asc" }],
    include: {
      user:    { select: { id: true, username: true } },
      faction: true,
      _count:  { select: { cards: true } },
      leader:  { include: { card: true } },
    },
  });

  // Filtra: só decks "jogáveis" (com líder + tamanho dentro dos limites)
  const playable = allDecks
    .filter((d) => d.leader)
    .filter((d) => d._count.cards >= settings.minCardsPerDeck)
    .filter((d) => d._count.cards <= settings.maxCardsPerDeck)
    .map((d) => ({
      id: d.id,
      name: d.name,
      userId: d.user.id,
      username: d.user.username,
      faction: { name: d.faction.name, color: d.faction.color },
      cardCount: d._count.cards,
      leaderName: d.leader!.card.name,
    }));

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
      <Link href="/partidas" className="text-sm text-zinc-500 hover:text-amber-200">
        ← Partidas
      </Link>
      <h1 className="text-3xl font-bold text-amber-200 mt-1 mb-2 font-heading">Nova partida</h1>
      <p className="text-zinc-400 mb-6 text-sm">
        Hot-seat: escolha 2 decks. Os jogadores se revezam na mesma máquina.
      </p>

      {playable.length < 2 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-8 text-center">
          <p className="text-zinc-400 mb-2">
            Precisa de pelo menos 2 decks jogáveis ({settings.minCardsPerDeck}–{settings.maxCardsPerDeck} cartas, com líder).
          </p>
          <p className="text-xs text-zinc-500">
            Decks atualmente válidos: <span className="text-amber-300 font-mono">{playable.length}</span>.
          </p>
          <Link href="/decks" className="text-amber-300 hover:text-amber-200 underline text-sm mt-3 inline-block">
            Ir aos decks →
          </Link>
        </div>
      ) : (
        <NewHotseatForm decks={playable} />
      )}
    </main>
  );
}