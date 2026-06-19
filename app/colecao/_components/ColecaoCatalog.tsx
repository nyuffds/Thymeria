"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CardPreview, CardPreviewData } from "@/app/components/CardPreview";
import { RARITIES } from "@/lib/constants";

interface Entry {
  cardId: string;
  quantity: number;
  card: CardPreviewData & { id: string };
}

interface Props {
  entries: Entry[];
  factions: { id: string; name: string; color: string }[];
}

export function ColecaoCatalog({ entries, factions }: Props) {
  const [query, setQuery] = useState("");
  const [factionFilter, setFactionFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");
  const [onlyDuplicates, setOnlyDuplicates] = useState(false);
  const [cardTypeFilter, setCardTypeFilter] = useState("");

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (factionFilter && e.card.faction.name !== factionFilter) return false;
      if (rarityFilter && e.card.rarity !== rarityFilter) return false;
      if (cardTypeFilter && e.card.cardType !== cardTypeFilter) return false;
      if (onlyDuplicates && e.quantity < 2) return false;
      if (query && !e.card.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [entries, query, factionFilter, rarityFilter, onlyDuplicates, cardTypeFilter]);

  return (
    <>
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

        <div>
          <label className="block text-xs uppercase text-zinc-500 mb-1">Tipo</label>
          <select
            value={cardTypeFilter}
            onChange={(e) => setCardTypeFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
          >
            <option value="">Todos</option>
            <option value="UNIT">Unidade</option>
            <option value="SPECIAL">Especial</option>
            <option value="WEATHER">Clima</option>
            <option value="LEADER">Lider</option>
          </select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer px-3 py-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={onlyDuplicates}
            onChange={(e) => setOnlyDuplicates(e.target.checked)}
            className="w-4 h-4 accent-amber-500"
          />
          Só duplicatas
        </label>

        {(query || factionFilter || rarityFilter || onlyDuplicates) && (
          <button
            onClick={() => {
              setQuery(""); setFactionFilter(""); setRarityFilter(""); setOnlyDuplicates(false);
            }}
            className="px-3 py-2 text-sm text-zinc-400 hover:text-amber-200"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-500 mb-4">
        Exibindo {filtered.length} de {entries.length} carta{entries.length !== 1 ? "s" : ""} únicas
      </p>

      {filtered.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
          Nenhuma carta com esses filtros.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
          {filtered.map((e) => (
            <Link
              key={e.cardId}
              href={`/colecao/${e.cardId}`}
              className="relative transition hover:scale-[1.03]"
            >
              <CardPreview card={e.card} />
              {e.quantity > 1 && (
                <span className="absolute -top-2 -right-2 bg-amber-500 text-zinc-950 font-bold text-sm px-2.5 py-1 rounded-full shadow-lg border-2 border-zinc-950">
                  ×{e.quantity}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}