// app/admin/cartas/_components/AdminCardsCatalog.tsx
// Grade filtrada de cartas (visão admin): mesmo visual do /cartas + filtro de released
// + overlay com botões Editar/Deletar no hover.

"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CardPreview, CardPreviewData } from "@/app/components/CardPreview";
import { deleteCardAction } from "@/lib/actions";
import { RARITIES } from "@/lib/constants";

interface CardWithRelations extends CardPreviewData {
  id: string;
  isReleased: boolean;
  isElite?: boolean;
}

interface Props {
  cards: CardWithRelations[];
  factions: { id: string; name: string; color: string }[];
}

export function AdminCardsCatalog({ cards, factions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [factionFilter, setFactionFilter] = useState<string>("");
  const [rarityFilter, setRarityFilter] = useState<string>("");
  const [showAll, setShowAll] = useState(true); // admin ve TODAS por padrão

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (!showAll && !c.isReleased) return false;
      if (factionFilter && c.faction.name !== factionFilter) return false;
      if (rarityFilter && c.rarity !== rarityFilter) return false;
      if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [cards, query, factionFilter, rarityFilter, showAll]);

  function handleDelete(e: React.MouseEvent, cardId: string, cardName: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Deletar a carta "${cardName}"? Esta acao nao pode ser desfeita.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteCardAction(cardId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao deletar.");
      }
    });
  }

  return (
    <>
      {/* Barra de filtros */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs uppercase text-zinc-500 mb-1">Buscar</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
            placeholder="Nome da carta..."
          />
        </div>

        <div>
          <label className="block text-xs uppercase text-zinc-500 mb-1">Facção</label>
          <select
            value={factionFilter}
            onChange={(e) => setFactionFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
          >
            <option value="">Todas</option>
            {factions.map((f) => (
              <option key={f.id} value={f.name}>{f.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase text-zinc-500 mb-1">Raridade</label>
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
          >
            <option value="">Todas</option>
            {RARITIES.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            className="w-4 h-4 accent-amber-500"
          />
          Mostrar rascunhos
        </label>

        {(query || factionFilter || rarityFilter) && (
          <button
            onClick={() => { setQuery(""); setFactionFilter(""); setRarityFilter(""); }}
            className="px-3 py-2 text-sm text-zinc-400 hover:text-amber-200"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
          {error}
        </p>
      )}

      <p className="text-xs text-zinc-500 mb-4">
        {filtered.length} de {cards.length} carta{cards.length !== 1 ? "s" : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
          Nenhuma carta encontrada com esses filtros.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 justify-items-center">
          {filtered.map((c) => (
            <div key={c.id} className="group relative">
              <CardPreview card={c} />

              {/* Badge de rascunho no canto da carta */}
              {!c.isReleased && (
                <div className="absolute top-2 right-2 z-30 bg-zinc-950/90 text-amber-300 text-xs px-2 py-1 rounded border border-amber-700 pointer-events-none">
                  rascunho
                </div>
              )}

              {/* Overlay de ações no hover */}
              <div className="absolute inset-0 z-30 flex items-end justify-center gap-2 p-4 opacity-0 group-hover:opacity-100 transition pointer-events-none">
                <Link
                  href={`/admin/cartas/${c.id}`}
                  className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-4 py-2 rounded text-sm shadow-lg transition pointer-events-auto"
                >
                  Editar
                </Link>
                <button
                  onClick={(e) => handleDelete(e, c.id, c.name)}
                  disabled={isPending}
                  className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-zinc-50 font-semibold px-4 py-2 rounded text-sm shadow-lg transition pointer-events-auto"
                >
                  Deletar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}