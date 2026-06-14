export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { MatchTableV2Skeleton } from "../_components/MatchTable_v2_skeleton";
import { LobbyWaitingRoom } from "../_components/LobbyWaitingRoom";

const prisma = new PrismaClient();

export default async function PartidaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      players: {
        include: {
          user: { select: { username: true } },
          deck: {
            include: {
              faction: true,
              leader: {
                include: { card: { include: { ability: true, faction: true } } },
              },
            },
          },
        },
      },
      hands: {
        include: { card: { include: { faction: true, ability: true } } },
      },
      board: {
        include: { card: { include: { faction: true, ability: true } } },
      },
      weather: {
        include: { card: { include: { faction: true, ability: true } } },
      },
      events: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!match) notFound();
  if (match.status === "LOBBY") {
    return <LobbyWaitingRoom matchId={match.id} match={match} sessionUserName={session.user.name} />;
  }
  const pA = match.players.find((p) => p.side === "A");
  const pB = match.players.find((p) => p.side === "B");
  if (!pA || !pB) notFound();

// Descobre qual lado o usuário logado está jogando (relevante em ONLINE).
  // Em HOTSEAT, viewerSide = null e ambos os lados são visíveis.
  const viewerUser = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  const viewerSide: "A" | "B" | null =
    match.mode === "ONLINE" && viewerUser
      ? (pA.userId === viewerUser.id ? "A" : pB.userId === viewerUser.id ? "B" : null)
      : null;

  // Em ONLINE, espectadores (nem A nem B) não veem a partida.
  if (match.mode === "ONLINE" && viewerSide === null) {
    redirect("/partidas");
  }
  
  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <Link href="/partidas" className="text-sm text-zinc-500 hover:text-amber-200">
          ← Partidas
        </Link>
        <p className="text-xs text-zinc-500 font-mono">
          {match.status} · Ronda {match.currentRound}
        </p>
      </div>

      <MatchTableV2Skeleton matchId={match.id} />
    </main>
  );
}