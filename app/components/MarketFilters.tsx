"use client";

import { useState, useMemo, ReactNode } from "react";

export interface FilterableItem {
  cards: Array<{
    name: string;
    rarity: string;
    factionName: string;
  }>;
}

interface Props<T extends FilterableItem> {
  items: T[];
  factions: string[];
  children: (filtered: T[]) => ReactNode;
  emptyMessage?: string;
}

const RARITIES = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"];
const RARITY_LABEL: Record<string, string> = {
  COMMON: "Comum", UNCOMMON: "Incomum", RARE: "Rara", EPIC: "Epica", LEGENDARY: "Lendaria",
};

export function MarketFilters<T extends FilterableItem>({ items, factions, children, emptyMessage }: Props<T>) {
  const [search, setSearch] = useState("");
  const [factionFilter, setFactionFilter] = useState("");
  const [rarityFilter, setRarityFilter] = useState("");

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const matches = it.cards.some((c) => {
        if (search.trim() && !c.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
        if (factionFilter && c.factionName !== factionFilter) return false;
        if (rarityFilter && c.rarity !== rarityFilter) return false;
        return true;
      });
      return matches;
    });
  }, [items, search, factionFilter, rarityFilter]);

  function clearFilters() {
    setSearch("");
    setFactionFilter("");
    setRarityFilter("");
  }

  const hasActiveFilter = search || factionFilter || rarityFilter;

  return (
    <div>
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-3 mb-4 flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome..."
          className="flex-1 min-w-[160px] px-3 py-1.5 bg-zinc-950 border border-zinc-700 text-zinc-200 rounded text-sm"
        />
        <select
          value={factionFilter}
          onChange={(e) => setFactionFilter(e.target.value)}
          className="px-3 py-1.5 bg-zinc-950 border border-zinc-700 text-zinc-200 rounded text-sm"
        >
          <option value="">Todas as faccoes</option>
          {factions.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
          value={rarityFilter}
          onChange={(e) => setRarityFilter(e.target.value)}
          className="px-3 py-1.5 bg-zinc-950 border border-zinc-700 text-zinc-200 rounded text-sm"
        >
          <option value="">Todas as raridades</option>
          {RARITIES.map((r) => <option key={r} value={r}>{RARITY_LABEL[r]}</option>)}
        </select>
        {hasActiveFilter && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs transition"
          >
            Limpar
          </button>
        )}
        <span className="text-xs text-zinc-500 ml-auto">{filtered.length} de {items.length}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
          <p>{emptyMessage ?? "Nenhum resultado para os filtros aplicados."}</p>
        </div>
      ) : children(filtered)}
    </div>
  );
}