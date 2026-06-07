// app/cartas/_components/CardsCatalog.tsx
// Grade filtrada de cartas para visualização pública.

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CardPreview, CardPreviewData } from "@/app/components/CardPreview";
import { RARITIES } from "@/lib/constants";

interface CardWithRelations extends CardPreviewData {
  id: string;
}

interface Props {
  cards: CardWithRelations[];
  factions: { id: string; name: string; color: string }[];
}

export function CardsCatalog({ cards, factions }: Props) {
  const [query, setQuery] = useState("");
  const [factionFilter, setFactionFilter] = useState<string>("");
  const [rarityFilter, setRarityFilter] = useState<string>("");

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (factionFilter && c.faction.name !== factionFilter) return false;
      if (rarityFilter && c.rarity !== rarityFilter) return false;
      if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [cards, query, factionFilter, rarityFilter]);

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

        {(query || factionFilter || rarityFilter) && (
          <button
            onClick={() => { setQuery(""); setFactionFilter(""); setRarityFilter(""); }}
            className="px-3 py-2 text-sm text-zinc-400 hover:text-amber-200"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-500 mb-4">
        {filtered.length} de {cards.length} carta{cards.length !== 1 ? "s" : ""}
      </p>

      {filtered.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
          Nenhuma carta encontrada com esses filtros.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/cartas/${c.id}`}
              className="transition hover:scale-[1.03]"
            >
              <CardPreview card={c} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}