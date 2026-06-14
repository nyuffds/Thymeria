export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { AcceptTradeButton } from "./_components/AcceptTradeButton";

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
        <div className="space-y-3">
          {offers.map((o) => {
            const isTargeted = o.targetUserId === me.id;
            return (
              <article
                key={o.id}
                className={
                  "rounded-lg border-2 bg-zinc-900/60 p-4 " +
                  (isTargeted ? "border-amber-700/60" : "border-zinc-800")
                }
              >
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <div className="text-sm">
                    <span className="text-zinc-500">De </span>
                    <strong className="text-amber-200">{o.creator.username}</strong>
                    {isTargeted && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/50">Direcionada a voce</span>}
                  </div>
                  <span className="text-xs text-zinc-500">{new Date(o.createdAt).toLocaleString("pt-BR")}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
                  {/* Oferece */}
                  <div className="bg-emerald-950/30 border border-emerald-900/50 rounded p-3">
                    <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2">Oferece</p>
                    <CardListView entries={o.offered} />
                    {o.coinsOffered > 0 && (
                      <p className="text-amber-300 font-mono text-sm mt-2">+ \u2728 {o.coinsOffered} moedas</p>
                    )}
                  </div>

                  <div className="text-2xl text-zinc-600 text-center">{"\u2194"}</div>

                  {/* Pede */}
                  <div className="bg-rose-950/30 border border-rose-900/50 rounded p-3">
                    <p className="text-xs text-rose-400 uppercase tracking-wider mb-2">Pede</p>
                    <CardListView entries={o.demanded} />
                    {o.coinsDemanded > 0 && (
                      <p className="text-amber-300 font-mono text-sm mt-2">+ \u2728 {o.coinsDemanded} moedas</p>
                    )}
                  </div>
                </div>

                {o.note && (
                  <p className="text-xs text-zinc-400 italic mt-3 px-2 py-1 bg-zinc-950/50 border-l-2 border-zinc-700">{o.note}</p>
                )}

                <div className="mt-4 flex justify-end">
                  <AcceptTradeButton offerId={o.id} hasEnoughCoins={me.coins >= o.coinsDemanded} />
                </div>
              </article>
            );
          })}
        </div>
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