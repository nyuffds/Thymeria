"use client";

import { useState, useTransition } from "react";

interface Player {
  userId: string;
  username: string;
}

interface H2HResult {
  totalMatches: number;
  winsA: number;
  winsB: number;
  draws: number;
}

interface Props {
  currentUserId: string;
  currentUsername: string;
  players: Player[];
  onCompare: (otherUserId: string) => Promise<H2HResult>;
}

export function HeadToHead({ currentUserId, currentUsername, players, onCompare }: Props) {
  const [otherUserId, setOtherUserId] = useState<string>("");
  const [result, setResult] = useState<H2HResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const others = players.filter((p) => p.userId !== currentUserId);
  const otherName = others.find((p) => p.userId === otherUserId)?.username ?? "";

  function compare() {
    if (!otherUserId) return;
    startTransition(async () => {
      const res = await onCompare(otherUserId);
      setResult(res);
    });
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-sm text-amber-300 font-bold">{currentUsername}</span>
        <span className="text-zinc-500">vs</span>
        <select
          value={otherUserId}
          onChange={(e) => { setOtherUserId(e.target.value); setResult(null); }}
          className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-2 py-1 text-sm"
        >
          <option value="">Selecione um jogador...</option>
          {others.map((p) => (
            <option key={p.userId} value={p.userId}>{p.username}</option>
          ))}
        </select>
        <button
          onClick={compare}
          disabled={!otherUserId || isPending}
          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {isPending ? "Buscando..." : "Comparar"}
        </button>
      </div>

      {result && (
        result.totalMatches === 0 ? (
          <p className="text-zinc-500 text-sm italic">Voces nunca se enfrentaram.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2 text-center">
            <Stat label="Partidas" value={result.totalMatches} color="#a1a1aa" />
            <Stat label={`Vitorias ${currentUsername}`} value={result.winsA} color="#34d399" />
            <Stat label={`Vitorias ${otherName}`} value={result.winsB} color="#f87171" />
            <Stat label="Empates" value={result.draws} color="#fbbf24" />
          </div>
        )
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 truncate" title={label}>{label}</p>
      <p className="text-xl font-mono font-bold" style={{ color }}>{value}</p>
    </div>
  );
}