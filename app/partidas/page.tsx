export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STATUS_LABEL: Record<string, string> = {
  SETUP:    "Preparando",
  REDRAW:   "Redraw",
  PLAYING:  "Em jogo",
  FINISHED: "Encerrada",
};

export default async function PartidasHubPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) redirect("/login");

  // Partidas em andamento (qualquer jogador)
  const matches = await prisma.match.findMany({
    where: { status: { not: "FINISHED" } },
    orderBy: { updatedAt: "desc" },
    include: {
      players: { include: { user: { select: { username: true } } } },
    },
    take: 20,
  });

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-amber-200 font-heading">Partidas</h1>
          <p className="text-sm text-zinc-400 mt-1 font-lore italic">
            Hot-seat: dois jogadores na mesma máquina.
          </p>
        </div>
        <Link
          href="/partidas/nova"
          className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition"
        >
          + Nova partida
        </Link>
      </div>

      {matches.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
          <p className="mb-4">Nenhuma partida em andamento.</p>
          <Link href="/partidas/nova" className="text-amber-300 hover:text-amber-200 underline">
            Iniciar uma →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => {
            const pA = m.players.find((p) => p.side === "A");
            const pB = m.players.find((p) => p.side === "B");
            return (
              <Link
                key={m.id}
                href={`/partidas/${m.id}`}
                className="block bg-zinc-900/60 border border-zinc-800 hover:border-amber-700 rounded-xl p-4 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-200">
                      {pA?.user.username ?? "?"}
                      <span className="text-zinc-500 mx-2">vs</span>
                      {pB?.user.username ?? "?"}
                    </span>
                    <span className="text-xs text-zinc-500">
                      Ronda {m.currentRound}
                    </span>
                  </div>
                  <span className="text-xs font-mono uppercase tracking-wider text-amber-400">
                    {STATUS_LABEL[m.status] ?? m.status}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}