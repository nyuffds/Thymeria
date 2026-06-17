"use client";

import { MarketFilters } from "@/app/components/MarketFilters";
import { AcceptTradeButton } from "./AcceptTradeButton";

interface Entry {
  quantity: number;
  cardName: string;
  cardImageUrl: string | null;
  rarity: string;
  factionName: string;
  factionColor: string;
}

interface Offer {
  id: string;
  creatorName: string;
  isTargeted: boolean;
  createdAt: string;
  offered: Entry[];
  demanded: Entry[];
  coinsOffered: number;
  coinsDemanded: number;
  note: string | null;
}

interface Props {
  offers: Offer[];
  factions: string[];
  myCoins: number;
}

const RARITY_COLOR: Record<string, string> = {
  COMMON: "#9ca3af", UNCOMMON: "#34d399", RARE: "#60a5fa", EPIC: "#a78bfa", LEGENDARY: "#fbbf24",
};

interface Filterable {
  cards: Array<{ name: string; rarity: string; factionName: string }>;
  data: Offer;
}

export function TrocasList({ offers, factions, myCoins }: Props) {
  const items: Filterable[] = offers.map((o) => ({
    // Combina cartas de ambos os lados pra filtro casar com qualquer um
    cards: [...o.offered, ...o.demanded].map((e) => ({
      name: e.cardName,
      rarity: e.rarity,
      factionName: e.factionName,
    })),
    data: o,
  }));

  return (
    <MarketFilters
      items={items}
      factions={factions}
      emptyMessage="Nenhuma oferta corresponde aos filtros."
    >
      {(filtered) => (
        <div className="space-y-3">
          {filtered.map((item) => {
            const o = item.data;
            return (
              <article
                key={o.id}
                className={
                  "rounded-lg border-2 bg-zinc-900/60 p-4 " +
                  (o.isTargeted ? "border-amber-700/60" : "border-zinc-800")
                }
              >
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div className="text-sm">
                    <span className="text-zinc-500">De </span>
                    <strong className="text-amber-200">{o.creatorName}</strong>
                    {o.isTargeted && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/50">Direcionada a voce</span>}
                  </div>
                  <span className="text-xs text-zinc-500">{new Date(o.createdAt).toLocaleString("pt-BR")}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
                  <div className="bg-emerald-950/30 border border-emerald-900/50 rounded p-3">
                    <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2">Oferece</p>
                    <CardListView entries={o.offered} />
                    {o.coinsOffered > 0 && (
                      <p className="text-amber-300 font-mono text-sm mt-2">+ ✨ {o.coinsOffered} moedas</p>
                    )}
                  </div>
                  <div className="text-2xl text-zinc-600 text-center">{"\u2194"}</div>
                  <div className="bg-rose-950/30 border border-rose-900/50 rounded p-3">
                    <p className="text-xs text-rose-400 uppercase tracking-wider mb-2">Pede</p>
                    <CardListView entries={o.demanded} />
                    {o.coinsDemanded > 0 && (
                      <p className="text-amber-300 font-mono text-sm mt-2">+ ✨ {o.coinsDemanded} moedas</p>
                    )}
                  </div>
                </div>

                {o.note && (
                  <p className="text-xs text-zinc-400 italic mt-3 px-2 py-1 bg-zinc-950/50 border-l-2 border-zinc-700">{o.note}</p>
                )}

                <div className="mt-4 flex justify-end">
                  <AcceptTradeButton offerId={o.id} hasEnoughCoins={myCoins >= o.coinsDemanded} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </MarketFilters>
  );
}

function CardListView({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return <p className="text-xs text-zinc-500 italic">Apenas moedas</p>;
  }
  return (
    <ul className="space-y-1">
      {entries.map((e, i) => (
        <li key={i} className="flex items-center gap-2 text-sm">
          {e.cardImageUrl && (
            <img src={e.cardImageUrl} alt={e.cardName} className="w-8 h-11 rounded object-cover flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate">
              <span style={{ color: RARITY_COLOR[e.rarity] ?? "#e5e7eb" }}>{e.cardName}</span>
              <span className="text-zinc-500 ml-1">x{e.quantity}</span>
            </p>
            <p className="text-xs" style={{ color: e.factionColor }}>{e.factionName}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}