export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { BuyButton } from "./_components/BuyButton";
import { MercadoList } from "./_components/MercadoList";

const prisma = new PrismaClient();

const RARITY_LABEL: Record<string, string> = {
  COMMON: "Comum",
  UNCOMMON: "Incomum",
  RARE: "Rara",
  EPIC: "Epica",
  LEGENDARY: "Lendaria",
};
const RARITY_COLOR: Record<string, string> = {
  COMMON: "#9ca3af",
  UNCOMMON: "#34d399",
  RARE: "#60a5fa",
  EPIC: "#a78bfa",
  LEGENDARY: "#fbbf24",
};

export default async function MercadoPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true, coins: true },
  });
  if (!me) redirect("/login");

  const listings = await prisma.marketListing.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: {
      card: { include: { faction: true } },
      seller: { select: { username: true } },
    },
    take: 100,
  });

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-amber-200 font-heading">Mercado</h1>
          <p className="text-sm text-zinc-400 mt-1 font-lore italic">
            Cartas oferecidas por outros jogadores.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-amber-300 font-mono text-sm" title="Suas moedas">✨ {me.coins}</span>
          <Link href="/mercado/minhas" className="text-sm text-zinc-300 hover:text-amber-200 transition">
            Minhas listagens
          </Link>
          <Link href="/mercado/trocas" className="text-sm text-zinc-300 hover:text-amber-200 transition">
            Trocas
          </Link>
          <Link href="/mercado/nova" className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition">
            + Vender carta
          </Link>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
          <p className="mb-2">Nenhuma carta a venda no momento.</p>
          <Link href="/mercado/nova" className="text-amber-300 hover:text-amber-200 underline">
            Seja o primeiro a listar
          </Link>
        </div>
      ) : (
        <MercadoList
          listings={listings.map((l) => ({
            id: l.id,
            sellerUserId: l.sellerUserId,
            sellerName: l.seller.username,
            quantity: l.quantity,
            pricePerUnit: l.pricePerUnit,
            cardName: l.card.name,
            cardImageUrl: l.card.imageUrl,
            rarity: l.card.rarity,
            factionName: l.card.faction.name,
            factionColor: l.card.faction.color,
          }))}
          factions={Array.from(new Set(listings.map((l) => l.card.faction.name))).sort()}
          meId={me.id}
          meCoins={me.coins}
        />
      )}
    </main>
  );
}