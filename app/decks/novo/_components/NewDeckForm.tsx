"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDeckAction } from "@/lib/actions";

interface LeaderOption {
  id: string;
  name: string;
  imageUrl: string | null;
  faction: { name: string; color: string };
}

export function NewDeckForm({ leaders }: { leaders: LeaderOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [leaderId, setLeaderId] = useState<string | null>(null);

  const selectedLeader = leaders.find((l) => l.id === leaderId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Dê um nome ao deck.");
      return;
    }
    if (!leaderId) {
      setError("Escolha um líder.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createDeckAction({ name: name.trim(), leaderCardId: leaderId });
        router.push("/decks/" + result.deckId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao criar deck.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm text-zinc-300 mb-2">Nome do deck</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                     text-zinc-100 focus:outline-none focus:border-amber-500"
          placeholder="Ex: Cavalaria de Valtres"
        />
      </div>

      <div>
        <label className="block text-sm text-zinc-300 mb-2">
          Líder ({leaders.length} disponíve{leaders.length === 1 ? "l" : "is"})
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {leaders.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLeaderId(l.id)}
              disabled={isPending}
              className={
                "flex items-center gap-3 p-3 rounded-lg border-2 text-left transition " +
                (leaderId === l.id
                  ? "bg-amber-950/30 border-amber-500"
                  : "bg-zinc-900 border-zinc-800 hover:border-zinc-600")
              }
            >
              <div
                className="w-12 h-12 rounded bg-zinc-800 flex-shrink-0"
                style={l.imageUrl ? {
                  backgroundImage: "url(" + l.imageUrl + ")",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                } : {}}
              />
              <div className="min-w-0">
                <p className="font-semibold text-zinc-100 truncate">{l.name}</p>
                <p className="text-xs" style={{ color: l.faction.color }}>{l.faction.name}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedLeader && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-400">
          Este deck será de <span className="font-semibold" style={{ color: selectedLeader.faction.color }}>
            {selectedLeader.faction.name}
          </span>. Só cartas dessa facção e Neutras poderão entrar.
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.push("/decks")}
          disabled={isPending}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending || !leaderId}
          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50
                     text-zinc-950 font-semibold px-6 py-2 rounded-lg transition"
        >
          {isPending ? "Criando..." : "Criar deck"}
        </button>
      </div>
    </form>
  );
}