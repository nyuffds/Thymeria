"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cancelLobbyAction } from "@/lib/lobby-actions";

interface LobbySummary {
  id: string;
  createdAt: string;
  creatorId: string | null;
  creatorName: string;
  playerCount: number;
  players: { userId: string; username: string }[];
  youCreated: boolean;
  youJoined: boolean;
}

export function LobbyList({ lobbies }: { lobbies: LobbySummary[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCancel(id: string) {
    if (!confirm("Cancelar este lobby?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await cancelLobbyAction(id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao cancelar.");
      }
    });
  }

  function timeAgo(isoString: string): string {
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
    if (diff < 60) return `há ${Math.floor(diff)}s`;
    if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
    return `há ${Math.floor(diff / 3600)}h`;
  }

  return (
    <>
      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2 mb-3">
          {error}
        </p>
      )}

      <div className="space-y-2">
        {lobbies.map((l) => {
          const action = l.youCreated
            ? "open"
            : l.youJoined
              ? "open"
              : l.playerCount < 2
                ? "join"
                : "full";

          return (
            <div
              key={l.id}
              className="bg-zinc-900/60 border border-zinc-800 hover:border-amber-700 rounded-xl p-4 flex items-center justify-between gap-3 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-amber-900/30 border border-amber-700/50 flex items-center justify-center text-amber-300 font-bold">
                  {l.creatorName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-zinc-200">
                    Sala de <span className="font-semibold">{l.creatorName}</span>
                    {l.youCreated && <span className="ml-2 text-xs text-amber-400">— sua sala</span>}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {l.playerCount}/2 jogadores · {timeAgo(l.createdAt)}
                    {l.players.length > 0 && (
                      <span> · {l.players.map((p) => p.username).join(", ")}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {action === "join" && (
                  <Link
                    href={`/partidas/${l.id}`}
                    className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-3 py-1.5 rounded text-sm transition"
                  >
                    Entrar
                  </Link>
                )}
                {action === "open" && (
                  <Link
                    href={`/partidas/${l.id}`}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded text-sm transition"
                  >
                    Abrir
                  </Link>
                )}
                {action === "full" && (
                  <span className="text-xs text-zinc-500 italic">Cheia</span>
                )}

                {l.youCreated && l.playerCount === 0 && (
                  <button
                    onClick={() => handleCancel(l.id)}
                    disabled={isPending}
                    className="text-red-400 hover:text-red-300 text-xs px-2"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}