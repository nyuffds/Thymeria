export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { BuyButton } from "./_components/BuyButton";

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((l) => {
            const totalPrice = l.pricePerUnit * l.quantity;
            const isMine = l.sellerUserId === me.id;
            return (
              <article
                key={l.id}
                className="rounded-lg border-2 bg-zinc-900/60 p-4 flex gap-3"
                style={{ borderColor: l.card.faction.color + "55" }}
              >
                {l.card.imageUrl && (
                  <img
                    src={l.card.imageUrl}
                    alt={l.card.name}
                    className="w-16 h-24 rounded object-cover flex-shrink-0"
                    style={{ border: `1px solid ${l.card.faction.color}88` }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-bold font-heading text-amber-200 truncate">
                    {l.card.name}
                  </h2>
                  <p className="text-xs" style={{ color: l.card.faction.color }}>
                    {l.card.faction.name}
                  </p>
                  <p className="text-xs mt-1">
                    <span style={{ color: RARITY_COLOR[l.card.rarity] ?? "#9ca3af" }}>
                      {RARITY_LABEL[l.card.rarity] ?? l.card.rarity}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Vendedor: <strong className="text-zinc-300">{l.seller.username}</strong>
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Quantidade: <strong className="text-zinc-200">{l.quantity}</strong>
                  </p>
                  <p className="text-sm text-amber-300 font-mono mt-2">
                    {l.pricePerUnit === 0 ? "Gratis" : (
                      <>
                        ✨ {l.pricePerUnit} cada
                        {l.quantity > 1 && <span className="text-zinc-500 ml-1">(total {totalPrice})</span>}
                      </>
                    )}
                  </p>
                  <div className="mt-3">
                    {isMine ? (
                      <span className="text-xs text-zinc-500 italic">Sua listagem</span>
                    ) : (
                      <BuyButton listingId={l.id} canAfford={me.coins >= totalPrice} totalPrice={totalPrice} />
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}