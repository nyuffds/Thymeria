"use client";

import type { TopCard } from "@/lib/stats";

interface Props {
  cards: TopCard[];
}

const RARITY_COLOR: Record<string, string> = {
  COMMON: "#9ca3af",
  UNCOMMON: "#34d399",
  RARE: "#60a5fa",
  EPIC: "#a78bfa",
  LEGENDARY: "#fbbf24",
};

export function TopCards({ cards }: Props) {
  if (cards.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 text-center text-zinc-500 text-sm">
        Ainda nao ha estatisticas de cartas.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-zinc-500 uppercase tracking-wider">
            <th className="text-left px-3 py-2 w-10">#</th>
            <th className="text-left px-3 py-2">Carta</th>
            <th className="text-left px-3 py-2">Faccao</th>
            <th className="text-right px-3 py-2">Usos</th>
            <th className="text-right px-3 py-2">Vit.</th>
            <th className="text-right px-3 py-2">Win%</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((c, i) => (
            <tr key={c.cardId} className="border-t border-zinc-800/60 hover:bg-zinc-900/60">
              <td className="px-3 py-2 text-zinc-500 font-mono text-xs">{i + 1}</td>
              <td className="px-3 py-2">
                <span style={{ color: RARITY_COLOR[c.rarity] ?? "#e5e7eb" }}>{c.name}</span>
              </td>
              <td className="px-3 py-2 text-xs" style={{ color: c.factionColor }}>{c.factionName}</td>
              <td className="text-right px-3 py-2 text-zinc-300 font-mono">{c.usageCount}</td>
              <td className="text-right px-3 py-2 text-emerald-400 font-mono">{c.winCount}</td>
              <td className="text-right px-3 py-2 text-amber-300 font-mono">{(c.winRate * 100).toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}