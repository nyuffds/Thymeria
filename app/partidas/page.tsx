export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { getUserMatchHistory } from "@/lib/stats";

const prisma = new PrismaClient();

const STATUS_LABEL: Record<string, string> = {
  SETUP:    "Preparando",
  REDRAW:   "Redraw",
  PLAYING:  "Em jogo",
  FINISHED: "Encerrada",
};

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m < 1) return s + "s";
  const h = Math.floor(m / 60);
  if (h < 1) return m + "min";
  return h + "h" + (m - h * 60) + "min";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function PartidasHubPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) redirect("/login");

  const [matches, history] = await Promise.all([
    prisma.match.findMany({
      where: { status: { not: "FINISHED" } },
      orderBy: { updatedAt: "desc" },
      include: {
        players: { include: { user: { select: { username: true } } } },
      },
      take: 20,
    }),
    getUserMatchHistory(user.id, 30),
  ]);

  const wins = history.filter((h) => h.result === "WIN").length;
  const losses = history.filter((h) => h.result === "LOSS").length;
  const draws = history.filter((h) => h.result === "DRAW").length;

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-amber-200 font-heading">Partidas</h1>
          <p className="text-sm text-zinc-400 mt-1 font-lore italic">
            Hot-seat: dois jogadores na mesma maquina. Online: pelo /lobby.
          </p>
        </div>
        <Link
          href="/partidas/nova"
          className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition"
        >
          + Nova partida
        </Link>
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-bold text-amber-200 font-heading mb-3">Em andamento</h2>
        {matches.length === 0 ? (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
            <p>Nenhuma partida em andamento.</p>
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
      </section>

      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-lg font-bold text-amber-200 font-heading">Seu hist&oacute;rico</h2>
          {history.length > 0 && (
            <p className="text-xs text-zinc-500 font-mono">
              <span className="text-emerald-400">{wins}V</span>
              {" - "}
              <span className="text-rose-400">{losses}D</span>
              {" - "}
              <span className="text-amber-400">{draws}E</span>
            </p>
          )}
        </div>
        {history.length === 0 ? (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">
            <p>Voce ainda nao terminou nenhuma partida.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((h) => {
              const resultColor =
                h.result === "WIN" ? "#34d399" :
                h.result === "LOSS" ? "#f87171" :
                "#fbbf24";
              const resultLabel =
                h.result === "WIN" ? "Vitoria" :
                h.result === "LOSS" ? "Derrota" :
                "Empate";
              return (
                <Link
                  key={h.matchId}
                  href={`/partidas/${h.matchId}`}
                  className="block bg-zinc-900/60 border border-zinc-800 hover:border-amber-700 rounded-xl p-4 transition"
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded"
                        style={{ background: resultColor + "22", color: resultColor, border: `1px solid ${resultColor}55` }}
                      >
                        {resultLabel}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-300">
                          Voce
                          <span style={{ color: h.yourFactionColor }} className="ml-1 text-xs">
                            ({h.yourFaction})
                          </span>
                          <span className="text-zinc-500 mx-2">vs</span>
                          <span className="text-zinc-200">{h.opponentName}</span>
                          <span style={{ color: h.opponentFactionColor }} className="ml-1 text-xs">
                            ({h.opponentFaction})
                          </span>
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5 font-mono">
                          Rondas {h.roundsWon.you}-{h.roundsWon.opponent} ·{" "}
                          {formatDuration(h.durationMs)} ·{" "}
                          {formatDate(h.finishedAt)} ·{" "}
                          {h.mode}
                        </p>
                      </div>
                    </div>
                    <span className="text-zinc-600 text-sm">{"\u2192"}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}