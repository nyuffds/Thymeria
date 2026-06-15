"use client";

import { MarketFilters } from "@/app/components/MarketFilters";
import { BuyButton } from "./BuyButton";

interface Listing {
  id: string;
  sellerUserId: string;
  sellerName: string;
  quantity: number;
  pricePerUnit: number;
  cardName: string;
  cardImageUrl: string | null;
  rarity: string;
  factionName: string;
  factionColor: string;
}

interface Props {
  listings: Listing[];
  factions: string[];
  meId: string;
  meCoins: number;
}

const RARITY_LABEL: Record<string, string> = {
  COMMON: "Comum", UNCOMMON: "Incomum", RARE: "Rara", EPIC: "Epica", LEGENDARY: "Lendaria",
};
const RARITY_COLOR: Record<string, string> = {
  COMMON: "#9ca3af", UNCOMMON: "#34d399", RARE: "#60a5fa", EPIC: "#a78bfa", LEGENDARY: "#fbbf24",
};

interface Filterable {
  cards: Array<{ name: string; rarity: string; factionName: string }>;
  data: Listing;
}

export function MercadoList({ listings, factions, meId, meCoins }: Props) {
  const items: Filterable[] = listings.map((l) => ({
    cards: [{ name: l.cardName, rarity: l.rarity, factionName: l.factionName }],
    data: l,
  }));

  return (
    <MarketFilters
      items={items}
      factions={factions}
      emptyMessage="Nenhuma listagem corresponde aos filtros."
    >
      {(filtered) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const l = item.data;
            const totalPrice = l.pricePerUnit * l.quantity;
            const isMine = l.sellerUserId === meId;
            return (
              <article
                key={l.id}
                className="rounded-lg border-2 bg-zinc-900/60 p-4 flex gap-3"
                style={{ borderColor: l.factionColor + "55" }}
              >
                {l.cardImageUrl && (
                  <img
                    src={l.cardImageUrl}
                    alt={l.cardName}
                    className="w-16 h-24 rounded object-cover flex-shrink-0"
                    style={{ border: `1px solid ${l.factionColor}88` }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-bold font-heading text-amber-200 truncate">{l.cardName}</h2>
                  <p className="text-xs" style={{ color: l.factionColor }}>{l.factionName}</p>
                  <p className="text-xs mt-1">
                    <span style={{ color: RARITY_COLOR[l.rarity] ?? "#9ca3af" }}>
                      {RARITY_LABEL[l.rarity] ?? l.rarity}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Vendedor: <strong className="text-zinc-300">{l.sellerName}</strong>
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Quantidade: <strong className="text-zinc-200">{l.quantity}</strong>
                  </p>
                  <p className="text-sm text-amber-300 font-mono mt-2">
                    {l.pricePerUnit === 0 ? "Gratis" : (
                      <>
                        \u2728 {l.pricePerUnit} cada
                        {l.quantity > 1 && <span className="text-zinc-500 ml-1">(total {totalPrice})</span>}
                      </>
                    )}
                  </p>
                  <div className="mt-3">
                    {isMine ? (
                      <span className="text-xs text-zinc-500 italic">Sua listagem</span>
                    ) : (
                      <BuyButton listingId={l.id} canAfford={meCoins >= totalPrice} totalPrice={totalPrice} />
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </MarketFilters>
  );
}