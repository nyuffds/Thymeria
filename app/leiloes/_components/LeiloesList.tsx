"use client";

import { MarketFilters } from "@/app/components/MarketFilters";
import { AuctionCard } from "./AuctionCard";

interface Auction {
  id: string;
  cardName: string;
  cardImageUrl: string | null;
  factionName: string;
  factionColor: string;
  rarity: string;
  quantity: number;
  minBid: number;
  durationSeconds: number;
  endsAt: string;
  bidCount: number;
  myBid: number | null;
}

interface Props {
  auctions: Auction[];
  factions: string[];
  myCoins: number;
  isAdmin: boolean;
}

interface Filterable {
  cards: Array<{ name: string; rarity: string; factionName: string }>;
  data: Auction;
}

export function LeiloesList({ auctions, factions, myCoins, isAdmin }: Props) {
  const items: Filterable[] = auctions.map((a) => ({
    cards: [{ name: a.cardName, rarity: a.rarity, factionName: a.factionName }],
    data: a,
  }));

  return (
    <MarketFilters
      items={items}
      factions={factions}
      emptyMessage="Nenhum leilao corresponde aos filtros."
    >
      {(filtered) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const a = item.data;
            return (
              <AuctionCard
                key={a.id}
                auctionId={a.id}
                cardName={a.cardName}
                cardImageUrl={a.cardImageUrl}
                factionName={a.factionName}
                factionColor={a.factionColor}
                rarity={a.rarity}
                quantity={a.quantity}
                minBid={a.minBid}
                durationSeconds={a.durationSeconds}
                endsAt={a.endsAt}
                bidCount={a.bidCount}
                myBid={a.myBid}
                myCoins={myCoins}
                isAdmin={isAdmin}
              />
            );
          })}
        </div>
      )}
    </MarketFilters>
  );
}