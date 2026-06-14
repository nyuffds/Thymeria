"use client";

import type { LeaderboardEntry } from "@/lib/stats";

interface Props {
  entries: LeaderboardEntry[];
  currentUserId: string;
}

export function Leaderboard({ entries, currentUserId }: Props) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 text-center text-zinc-500 text-sm">
        Nenhuma partida finalizada ainda.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-zinc-500 uppercase tracking-wider">
            <th className="text-left px-3 py-2 w-10">#</th>
            <th className="text-left px-3 py-2">Jogador</th>
            <th className="text-right px-3 py-2">V</th>
            <th className="text-right px-3 py-2">D</th>
            <th className="text-right px-3 py-2">E</th>
            <th className="text-right px-3 py-2">Win%</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const isMe = e.userId === currentUserId;
            return (
              <tr
                key={e.userId}
                className={
                  "border-t border-zinc-800/60 " +
                  (isMe ? "bg-amber-900/20" : "hover:bg-zinc-900/60")
                }
              >
                <td className="px-3 py-2 text-zinc-500 font-mono text-xs">{i + 1}</td>
                <td className="px-3 py-2">
                  <span className={isMe ? "text-amber-300 font-bold" : "text-zinc-200"}>
                    {e.username}
                  </span>
                  {isMe && <span className="text-zinc-500 text-xs ml-2">(voce)</span>}
                </td>
                <td className="text-right px-3 py-2 text-emerald-400 font-mono">{e.wins}</td>
                <td className="text-right px-3 py-2 text-rose-400 font-mono">{e.losses}</td>
                <td className="text-right px-3 py-2 text-zinc-400 font-mono">{e.draws}</td>
                <td className="text-right px-3 py-2 text-amber-300 font-mono">
                  {(e.winRate * 100).toFixed(0)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}