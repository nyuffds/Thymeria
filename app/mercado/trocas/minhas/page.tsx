export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { CancelTradeButton } from "../_components/CancelTradeButton";

const prisma = new PrismaClient();

const RARITY_COLOR: Record<string, string> = {
  COMMON: "#9ca3af",
  UNCOMMON: "#34d399",
  RARE: "#60a5fa",
  EPIC: "#a78bfa",
  LEGENDARY: "#fbbf24",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  ACCEPTED: "Aceita",
  REJECTED: "Recusada",
  CANCELLED: "Cancelada",
};
const STATUS_COLOR: Record<string, string> = {
  PENDING: "#fcd34d",
  ACCEPTED: "#34d399",
  REJECTED: "#f87171",
  CANCELLED: "#71717a",
};

export default async function MinhasOfertasPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!me) redirect("/login");

  const offers = await prisma.tradeOffer.findMany({
    where: { creatorUserId: me.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      target:   { select: { username: true } },
      acceptor: { select: { username: true } },
      offered:  { include: { card: { include: { faction: true } } } },
      demanded: { include: { card: { include: { faction: true } } } },
    },
  });

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
      <nav className="mb-4 flex items-center gap-3 text-sm">
        <Link href="/mercado/trocas" className="text-zinc-500 hover:text-amber-200 transition">{"\u2190 Trocas"}</Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-3xl font-bold text-amber-200 font-heading">Minhas ofertas de troca</h1>
        <p className="text-sm text-zinc-400 mt-1 font-lore italic">
          Acompanhe e cancele suas ofertas.
        </p>
      </header>

      {offers.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
          <p className="mb-2">Voce ainda nao criou ofertas.</p>
          <Link href="/mercado/trocas/nova" className="text-amber-300 hover:text-amber-200 underline">Criar primeira oferta</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((o) => (
            <article key={o.id} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded"
                    style={{
                      background: STATUS_COLOR[o.status] + "22",
                      color: STATUS_COLOR[o.status],
                      border: `1px solid ${STATUS_COLOR[o.status]}55`,
                    }}
                  >
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                  {o.targetUserId && o.target && (
                    <span className="text-xs text-zinc-400">Direcionada a <strong>{o.target.username}</strong></span>
                  )}
                  {!o.targetUserId && <span className="text-xs text-zinc-500">P\u00fablica</span>}
                  {o.acceptor && (
                    <span className="text-xs text-emerald-400">\u2192 Aceita por <strong>{o.acceptor.username}</strong></span>
                  )}
                </div>
                <span className="text-xs text-zinc-500">{new Date(o.createdAt).toLocaleString("pt-BR")}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center mb-3">
                <div className="bg-emerald-950/30 border border-emerald-900/50 rounded p-3">
                  <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2">Voce oferece</p>
                  <CardListView entries={o.offered} />
                  {o.coinsOffered > 0 && (
                    <p className="text-amber-300 font-mono text-sm mt-2">+ \u2728 {o.coinsOffered} moedas</p>
                  )}
                </div>
                <div className="text-2xl text-zinc-600 text-center">{"\u2194"}</div>
                <div className="bg-rose-950/30 border border-rose-900/50 rounded p-3">
                  <p className="text-xs text-rose-400 uppercase tracking-wider mb-2">Voce pede</p>
                  <CardListView entries={o.demanded} />
                  {o.coinsDemanded > 0 && (
                    <p className="text-amber-300 font-mono text-sm mt-2">+ \u2728 {o.coinsDemanded} moedas</p>
                  )}
                </div>
              </div>

              {o.note && (
                <p className="text-xs text-zinc-400 italic mt-2 px-2 py-1 bg-zinc-950/50 border-l-2 border-zinc-700">{o.note}</p>
              )}

              {o.status === "PENDING" && (
                <div className="mt-3 flex justify-end">
                  <CancelTradeButton offerId={o.id} />
                </div>
              )}
            </article>
          ))}
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