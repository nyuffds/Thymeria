export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { LobbyList } from "./_components/LobbyList";
import { CreateLobbyButton } from "./_components/CreateLobbyButton";
import { Leaderboard } from "./_components/Leaderboard";
import { HeadToHead } from "./_components/HeadToHead";
import { TopCards } from "./_components/TopCards";
import { getLeaderboard, getMostUsedCards } from "@/lib/stats";
import { getHeadToHeadAction } from "./_actions";

const prisma = new PrismaClient();

export default async function LobbyPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) redirect("/login");

  const lobbies = await prisma.match.findMany({
    where: {
      mode: "ONLINE",
      status: "LOBBY",
    },
    orderBy: { createdAt: "desc" },
    include: {
      players: {
        include: { user: { select: { id: true, username: true } } },
      },
    },
    take: 50,
  });

  // Decora cada lobby com o nome do criador
  const creatorIds = lobbies
    .map((l) => l.creatorUserId)
    .filter((v): v is string => v !== null);
  const creators = await prisma.user.findMany({
    where: { id: { in: creatorIds } },
    select: { id: true, username: true },
  });
  const creatorMap = new Map(creators.map((c) => [c.id, c.username]));

  const decorated = lobbies.map((l) => ({
    id: l.id,
    createdAt: l.createdAt.toISOString(),
    creatorId: l.creatorUserId,
    creatorName: l.creatorUserId ? (creatorMap.get(l.creatorUserId) ?? "?") : "?",
    playerCount: l.players.length,
    players: l.players.map((p) => ({
      userId: p.user.id,
      username: p.user.username,
    })),
    youCreated: l.creatorUserId === user.id,
    youJoined: l.players.some((p) => p.user.id === user.id),
  }));

  const ownOpenLobby = decorated.find((l) => l.youCreated);

  // Stats para o leaderboard / head-to-head / cartas mais usadas
  const [leaderboard, topCards, allPlayers] = await Promise.all([
    getLeaderboard(10),
    getMostUsedCards(10),
    prisma.user.findMany({ select: { id: true, username: true }, orderBy: { username: "asc" } }).then((us) => us.map((u) => ({ userId: u.id, username: u.username }))),
  ]);
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { username: true },
  });

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-amber-200 font-heading">Salas abertas</h1>
          <p className="text-sm text-zinc-400 mt-1 font-lore italic">
            Partidas multiplayer ao vivo.
          </p>
        </div>
        <CreateLobbyButton hasOpenLobby={!!ownOpenLobby} />
      </div>

      {decorated.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
          <p className="mb-1">Nenhuma sala aberta.</p>
          <p className="text-xs">Crie uma sala e aguarde alguém entrar.</p>
        </div>
      ) : (
        <LobbyList lobbies={decorated} />
      )}

      <section className="mt-12 space-y-8">
        <div>
          <h2 className="text-xl font-bold text-amber-200 font-heading mb-3">Leaderboard</h2>
          <Leaderboard entries={leaderboard} currentUserId={user.id} />
        </div>

        <div>
          <h2 className="text-xl font-bold text-amber-200 font-heading mb-3">Comparar com outro jogador</h2>
          <HeadToHead
            currentUserId={user.id}
            currentUsername={me?.username ?? "Voce"}
            players={allPlayers}
            onCompare={getHeadToHeadAction}
          />
        </div>

        <div>
          <h2 className="text-xl font-bold text-amber-200 font-heading mb-3">Cartas mais usadas</h2>
          <TopCards cards={topCards} />
        </div>
      </section>
    </main>
  );
}