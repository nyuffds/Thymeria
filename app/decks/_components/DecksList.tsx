"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteDeckAction } from "@/lib/actions";

interface DeckSummary {
  id: string;
  name: string;
  faction: { name: string; color: string };
  cardCount: number;
  leader: { name: string; imageUrl: string | null } | null;
  updatedAt: string;
  isValid: boolean;
  minCards: number;
  maxCards: number;
}

export function DecksList({ decks }: { decks: DeckSummary[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(deck: DeckSummary) {
    if (!confirm(`Excluir o deck "${deck.name}"? Esta ação não pode ser desfeita.`)) return;

    startTransition(async () => {
      try {
        await deleteDeckAction(deck.id);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erro ao excluir.");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {decks.map((d) => (
        <div
          key={d.id}
          className="bg-zinc-900/60 border-2 rounded-xl overflow-hidden flex flex-col"
          style={{ borderColor: d.faction.color + "55" }}
        >
          {/* Banner com líder */}
          <Link href={`/decks/${d.id}`} className="block">
            <div
              className="aspect-[5/2] bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center relative overflow-hidden"
              style={d.leader?.imageUrl ? {
                backgroundImage: "url(" + d.leader.imageUrl + ")",
                backgroundSize: "cover",
                backgroundPosition: "center top",
              } : {}}
            >
              {!d.leader?.imageUrl && <span className="text-5xl text-zinc-700">⚔</span>}
              <div
                className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent"
              />
              <div className="absolute bottom-2 left-3 right-3">
                <p className="text-xs uppercase tracking-wider" style={{ color: d.faction.color }}>
                  {d.faction.name}
                </p>
                <h3 className="font-heading font-bold text-amber-200 text-lg leading-tight">
                  {d.name}
                </h3>
              </div>
            </div>
          </Link>

          <div className="p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-zinc-400">
                Líder: <span className="text-zinc-200">{d.leader?.name ?? "—"}</span>
              </span>
              <span className={d.isValid ? "text-emerald-400 font-mono" : "text-amber-400 font-mono"}>
                {d.cardCount} / {d.maxCards}
              </span>
            </div>

            {!d.isValid && (
              <p className="text-xs text-amber-500 italic mb-3">
                {d.cardCount < d.minCards
                  ? `Faltam ${d.minCards - d.cardCount} cartas para jogar`
                  : `Excesso de ${d.cardCount - d.maxCards} cartas`}
              </p>
            )}

            <div className="mt-auto flex gap-2">
              <Link
                href={`/decks/${d.id}`}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold text-center py-1.5 rounded text-sm transition"
              >
                Editar
              </Link>
              <button
                onClick={() => handleDelete(d)}
                disabled={isPending}
                className="px-3 py-1.5 text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}