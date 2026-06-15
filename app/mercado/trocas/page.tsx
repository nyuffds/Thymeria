export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { AcceptTradeButton } from "./_components/AcceptTradeButton";
import { TrocasList } from "./_components/TrocasList";

const prisma = new PrismaClient();

const RARITY_COLOR: Record<string, string> = {
  COMMON: "#9ca3af",
  UNCOMMON: "#34d399",
  RARE: "#60a5fa",
  EPIC: "#a78bfa",
  LEGENDARY: "#fbbf24",
};

export default async function TrocasPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true, coins: true },
  });
  if (!me) redirect("/login");

  // Ofertas visiveis pra mim: publicas (targetUserId null) + direcionadas a mim
  const offers = await prisma.tradeOffer.findMany({
    where: {
      status: "PENDING",
      OR: [
        { targetUserId: null },
        { targetUserId: me.id },
      ],
      NOT: { creatorUserId: me.id },
    },
    orderBy: { createdAt: "desc" },
    include: {
      creator: { select: { username: true } },
      offered:  { include: { card: { include: { faction: true } } } },
      demanded: { include: { card: { include: { faction: true } } } },
    },
    take: 100,
  });

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <nav className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/mercado" className="text-zinc-500 hover:text-amber-200 transition">{"\u2190 Mercado (vendas)"}</Link>
          <span className="text-zinc-700">|</span>
          <Link href="/mercado/trocas/minhas" className="text-zinc-300 hover:text-amber-200 transition">Minhas ofertas</Link>
        </div>
        <Link href="/mercado/trocas/nova" className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-4 py-2 rounded-lg text-sm transition">
          + Criar oferta
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-3xl font-bold text-amber-200 font-heading">Trocas</h1>
        <p className="text-sm text-zinc-400 mt-1 font-lore italic">
          Ofertas publicas ou direcionadas a voce. Aceite ou ignore.
        </p>
      </header>

      {offers.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
          <p>Nenhuma oferta de troca dispon\u00edvel para voce no momento.</p>
        </div>
      ) : (
        <TrocasList
          offers={offers.map((o) => ({
            id: o.id,
            creatorName: o.creator.username,
            isTargeted: o.targetUserId === me.id,
            createdAt: o.createdAt.toISOString(),
            offered: o.offered.map((e) => ({
              quantity: e.quantity,
              cardName: e.card.name,
              cardImageUrl: e.card.imageUrl,
              rarity: e.card.rarity,
              factionName: e.card.faction.name,
              factionColor: e.card.faction.color,
            })),
            demanded: o.demanded.map((e) => ({
              quantity: e.quantity,
              cardName: e.card.name,
              cardImageUrl: e.card.imageUrl,
              rarity: e.card.rarity,
              factionName: e.card.faction.name,
              factionColor: e.card.faction.color,
            })),
            coinsOffered: o.coinsOffered,
            coinsDemanded: o.coinsDemanded,
            note: o.note,
          }))}
          factions={Array.from(new Set(
            offers.flatMap((o) => [...o.offered, ...o.demanded].map((e) => e.card.faction.name))
          )).sort()}
          myCoins={me.coins}
        />
      )}
    </main>
  );
}

interface Entry {
  quantity: number;
  card: {
    name: string;
    rarity: string;
    imageUrl: string | null;
    faction: { name: string; color: string };
  };
}

function CardListView({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return <p className="text-xs text-zinc-500 italic">Apenas moedas</p>;
  }
  return (
    <ul className="space-y-1">
      {entries.map((e, i) => (
        <li key={i} className="flex items-center gap-2 text-sm">
          {e.card.imageUrl && (
            <img src={e.card.imageUrl} alt={e.card.name} className="w-8 h-11 rounded object-cover flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate">
              <span style={{ color: RARITY_COLOR[e.card.rarity] ?? "#e5e7eb" }}>{e.card.name}</span>
              <span className="text-zinc-500 ml-1">x{e.quantity}</span>
            </p>
            <p className="text-xs" style={{ color: e.card.faction.color }}>{e.card.faction.name}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}