"use client";

import { useState } from "react";

interface Props {
  deckCount: number;
  discardCount: number;
  factionColor: string;
  // Lado "A" = pilhas em baixo (jogador); "B" = em cima (oponente)
  side: "A" | "B";
}

export function DeckPiles({ deckCount, discardCount, factionColor, side }: Props) {
  const [hoveredPile, setHoveredPile] = useState<"deck" | "discard" | null>(null);

  return (
    <div className="flex flex-col gap-2 items-center w-16 flex-shrink-0">
      {/* Pilha de DECK (verso) */}
      <div
        className="relative w-14 h-20 rounded border-2 cursor-help transition hover:scale-105"
        style={{
          borderColor: factionColor + "aa",
          backgroundImage: "linear-gradient(135deg, #3d2817 0%, #1a0f06 50%, #3d2817 100%)",
          boxShadow:
            "0 2px 4px rgba(0,0,0,0.5), " +
            "2px 0 0 -1px #1a0f06, " +
            "3px 1px 0 -1px " + factionColor + "55, " +
            "4px 2px 0 -1px #1a0f06",
        }}
        onMouseEnter={() => setHoveredPile("deck")}
        onMouseLeave={() => setHoveredPile(null)}
      >
        <div className="absolute inset-0 flex items-center justify-center text-2xl"
             style={{ color: factionColor + "cc", textShadow: "0 0 6px " + factionColor + "88" }}>
          ✦
        </div>
        <div className="absolute bottom-0.5 inset-x-0 text-center text-[10px] font-mono font-bold text-amber-200 bg-black/70 leading-none py-0.5">
          {deckCount}
        </div>

          {hoveredPile === "deck" && (
          <div className="absolute z-50 bg-zinc-900 border border-amber-700 rounded p-2 text-xs whitespace-nowrap shadow-xl pointer-events-none right-full mr-2 top-1/2 -translate-y-1/2">
            <p className="text-amber-300 font-semibold">Deck</p>
            <p className="text-zinc-400">{deckCount} carta(s) restante(s)</p>
          </div>
        )}
      </div>

      {/* Pilha de DESCARTE */}
      <div
        className="relative w-14 h-20 rounded border-2 cursor-help transition hover:scale-105"
        style={{
          borderColor: "#52525b",
          backgroundImage:
            discardCount > 0
              ? "linear-gradient(135deg, #1f1f23 0%, #0a0a0a 50%, #1f1f23 100%)"
              : "linear-gradient(135deg, rgba(40,40,45,0.4) 0%, rgba(10,10,10,0.4) 50%, rgba(40,40,45,0.4) 100%)",
          boxShadow: discardCount > 0
            ? "0 2px 4px rgba(0,0,0,0.5), 2px 0 0 -1px #0a0a0a, 3px 1px 0 -1px #2a2a2a"
            : "inset 0 0 8px rgba(0,0,0,0.5)",
          opacity: discardCount > 0 ? 1 : 0.5,
        }}
        onMouseEnter={() => setHoveredPile("discard")}
        onMouseLeave={() => setHoveredPile(null)}
      >
        <div className="absolute inset-0 flex items-center justify-center text-2xl text-zinc-600">
          {discardCount > 0 ? "🗑" : "—"}
        </div>
        <div className="absolute bottom-0.5 inset-x-0 text-center text-[10px] font-mono font-bold text-zinc-300 bg-black/70 leading-none py-0.5">
          {discardCount}
        </div>

{hoveredPile === "discard" && (
          <div className="absolute z-50 bg-zinc-900 border border-zinc-700 rounded p-2 text-xs whitespace-nowrap shadow-xl pointer-events-none right-full mr-2 top-1/2 -translate-y-1/2">
            <p className="text-zinc-300 font-semibold">Descarte</p>
            <p className="text-zinc-500">{discardCount} carta(s) usada(s)</p>
          </div>
        )}
      </div>
    </div>
  );
}