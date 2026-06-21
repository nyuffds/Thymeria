export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { AuctionCard } from "./_components/AuctionCard";
import { LeiloesList } from "./_components/LeiloesList";

const prisma = new PrismaClient();

export default async function LeiloesPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true, role: true, coins: true },
  });
  if (!me) redirect("/login");

  const isAdmin = me.role === "ADMIN";

  const auctions = await prisma.auction.findMany({
    where: { status: "ACTIVE" },
    orderBy: { endsAt: "asc" },
    include: {
      card: { include: { faction: true } },
      bids: { select: { id: true, bidderUserId: true } },
    },
  });

  const myBids = await prisma.auctionBid.findMany({
    where: { bidderUserId: me.id, auction: { status: "ACTIVE" } },
    select: { auctionId: true, amount: true },
  });
  const myBidsMap = new Map(myBids.map((b) => [b.auctionId, b.amount]));

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-amber-200 font-heading">Leiloes</h1>
          <p className="text-sm text-zinc-400 mt-1 font-lore italic">
            Lances secretos. Maior ganha.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-amber-300 font-mono text-sm">✨ {me.coins}</span>
          {isAdmin && (
            <>
              <Link href="/admin/leiloes" className="text-sm text-zinc-300 hover:text-amber-200 transition">
                Gerenciar
              </Link>
              <Link href="/admin/leiloes/novo" className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-4 py-2 rounded-lg text-sm transition">
                + Criar leilao
              </Link>
            </>
          )}
        </div>
      </div>

      {auctions.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
          <p>Nenhum leilao ativo no momento.</p>
        </div>
      ) : (
        <LeiloesList
          auctions={auctions.map((a) => ({
            id: a.id,
            cardName: a.card.name,
            cardImageUrl: a.card.imageUrl,
            factionName: a.card.faction.name,
            factionColor: a.card.faction.color,
            rarity: a.card.rarity,
            quantity: a.quantity,
            minBid: a.minBid,
            durationSeconds: a.durationSeconds,
            endsAt: a.endsAt.toISOString(),
            bidCount: a.bids.length,
            myBid: myBidsMap.get(a.id) ?? null,
          }))}
          factions={Array.from(new Set(auctions.map((a) => a.card.faction.name))).sort()}
          myCoins={me.coins}
          isAdmin={isAdmin}
        />
      )}
    </main>
  );
}