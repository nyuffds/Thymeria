export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { CancelAuctionButton } from "./_components/CancelAuctionButton";
import { FinishAuctionButton } from "./_components/FinishAuctionButton";

const prisma = new PrismaClient();

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativo",
  FINISHED: "Encerrado",
  CANCELLED: "Cancelado",
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#fcd34d",
  FINISHED: "#34d399",
  CANCELLED: "#71717a",
};

export default async function AdminLeiloesPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { role: true },
  });
  if (!me || me.role !== "ADMIN") redirect("/");

  const auctions = await prisma.auction.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      card: { include: { faction: true } },
      bids: {
        orderBy: { amount: "desc" },
        include: { bidder: { select: { username: true } } },
      },
      winner: { select: { username: true } },
    },
    take: 50,
  });

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <nav className="mb-4 text-sm">
        <Link href="/admin" className="text-zinc-500 hover:text-amber-200 transition">{"\u2190 Admin"}</Link>
      </nav>

      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-amber-200 font-heading">Gerenciar leiloes</h1>
          <p className="text-sm text-zinc-400 mt-1 font-lore italic">
            Veja todos os lances. Encerre quando achar adequado.
          </p>
        </div>
        <Link href="/admin/leiloes/novo" className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition">
          + Criar leilao
        </Link>
      </div>

      {auctions.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
          <p className="mb-2">Nenhum leilao criado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {auctions.map((a) => (
            <article key={a.id} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-start gap-4">
                {a.card.imageUrl && (
                  <img src={a.card.imageUrl} alt={a.card.name} className="w-16 h-24 rounded object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-bold text-amber-200">{a.card.name}</p>
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        background: STATUS_COLOR[a.status] + "22",
                        color: STATUS_COLOR[a.status],
                        border: `1px solid ${STATUS_COLOR[a.status]}55`,
                      }}
                    >
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                    <span className="text-xs text-zinc-500">Qtd {a.quantity}</span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Min: \u2728 {a.minBid} \u00b7 Dura\u00e7\u00e3o: {a.durationSeconds}s \u00b7 Termina:{" "}
                    {new Date(a.endsAt).toLocaleString("pt-BR")}
                  </p>

                  {a.bids.length > 0 ? (
                    <div className="mt-3 bg-zinc-950 border border-zinc-800 rounded p-2">
                      <p className="text-xs text-amber-400 mb-2 font-bold uppercase tracking-wider">Lances ({a.bids.length})</p>
                      <ul className="space-y-1">
                        {a.bids.map((b, i) => (
                          <li key={b.id} className="flex items-center justify-between text-xs">
                            <span className={i === 0 && a.status === "ACTIVE" ? "text-emerald-300 font-bold" : "text-zinc-300"}>
                              {i + 1}. {b.bidder.username}
                              {i === 0 && a.status === "ACTIVE" && <span className="ml-1 text-emerald-500">(maior atual)</span>}
                            </span>
                            <span className="font-mono text-amber-300">\u2728 {b.amount}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-600 italic mt-3">Nenhum lance ainda.</p>
                  )}

                  {a.status === "FINISHED" && a.winner && (
                    <p className="text-xs text-emerald-400 mt-2">
                      Vencedor: <strong>{a.winner.username}</strong> com \u2728 {a.winningBid}
                    </p>
                  )}
                  {a.status === "FINISHED" && !a.winner && (
                    <p className="text-xs text-zinc-500 mt-2 italic">Encerrado sem vencedor.</p>
                  )}
                </div>

                {a.status === "ACTIVE" && (
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <FinishAuctionButton auctionId={a.id} />
                    <CancelAuctionButton auctionId={a.id} />
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}