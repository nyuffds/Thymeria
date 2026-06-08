"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createHotseatMatchAction } from "@/lib/match-actions";

interface DeckOpt {
  id: string;
  name: string;
  userId: string;
  username: string;
  faction: { name: string; color: string };
  cardCount: number;
  leaderName: string;
}

export function NewHotseatForm({ decks }: { decks: DeckOpt[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [deckIdA, setDeckIdA] = useState<string>(decks[0]?.id ?? "");
  const [deckIdB, setDeckIdB] = useState<string>(decks[1]?.id ?? "");

  const deckA = decks.find((d) => d.id === deckIdA);
  const deckB = decks.find((d) => d.id === deckIdB);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (deckIdA === deckIdB) {
      setError("Os dois lados precisam de decks diferentes.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createHotseatMatchAction({ deckIdA, deckIdB });
        router.push("/partidas/" + result.matchId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao iniciar partida.");
      }
    });
  }

  function renderDeckCard(d: DeckOpt | undefined, label: string) {
    if (!d) return null;
    return (
      <div className="bg-zinc-900/60 border-2 rounded-lg p-3 text-sm"
           style={{ borderColor: d.faction.color + "55" }}>
        <p className="text-xs uppercase text-zinc-500">{label}</p>
        <p className="font-semibold text-zinc-100 mt-0.5">{d.username}</p>
        <p className="text-zinc-300">{d.name}</p>
        <p className="text-xs mt-1" style={{ color: d.faction.color }}>
          {d.faction.name} · líder {d.leaderName} · {d.cardCount} cartas
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-zinc-300 mb-2">Lado A</label>
          <select
            value={deckIdA}
            onChange={(e) => setDeckIdA(e.target.value)}
            disabled={isPending}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
          >
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.username} — {d.name}
              </option>
            ))}
          </select>
          <div className="mt-3">{renderDeckCard(deckA, "Lado A")}</div>
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-2">Lado B</label>
          <select
            value={deckIdB}
            onChange={(e) => setDeckIdB(e.target.value)}
            disabled={isPending}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
          >
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.username} — {d.name}
              </option>
            ))}
          </select>
          <div className="mt-3">{renderDeckCard(deckB, "Lado B")}</div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.push("/partidas")}
          disabled={isPending}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending || deckIdA === deckIdB}
          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50
                     text-zinc-950 font-semibold px-6 py-2 rounded-lg transition"
        >
          {isPending ? "Iniciando..." : "Iniciar partida"}
        </button>
      </div>
    </form>
  );
}