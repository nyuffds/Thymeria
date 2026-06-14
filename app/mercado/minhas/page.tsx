export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { CancelButton } from "../_components/CancelButton";

const prisma = new PrismaClient();

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativa",
  SOLD: "Vendida",
  CANCELLED: "Cancelada",
};
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#fcd34d",
  SOLD: "#34d399",
  CANCELLED: "#71717a",
};

export default async function MinhasListagensPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!me) redirect("/login");

  const listings = await prisma.marketListing.findMany({
    where: { sellerUserId: me.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      card: { include: { faction: true } },
      buyer: { select: { username: true } },
    },
  });

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
      <nav className="mb-4">
        <Link href="/mercado" className="text-sm text-zinc-500 hover:text-amber-200 transition">
          {"\u2190 Mercado"}
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-3xl font-bold text-amber-200 font-heading">Minhas listagens</h1>
        <p className="text-sm text-zinc-400 mt-1 font-lore italic">
          Acompanhe suas vendas e cancele listagens ativas.
        </p>
      </header>

      {listings.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
          <p className="mb-2">Voce ainda nao listou nenhuma carta.</p>
          <Link href="/mercado/nova" className="text-amber-300 hover:text-amber-200 underline">
            Listar primeira carta
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {listings.map((l) => {
            const totalPrice = l.pricePerUnit * l.quantity;
            return (
              <article
                key={l.id}
                className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex items-center gap-4"
              >
                {l.card.imageUrl && (
                  <img
                    src={l.card.imageUrl}
                    alt={l.card.name}
                    className="w-12 h-18 rounded object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-amber-200">{l.card.name}</p>
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        background: STATUS_COLOR[l.status] + "22",
                        color: STATUS_COLOR[l.status],
                        border: `1px solid ${STATUS_COLOR[l.status]}55`,
                      }}
                    >
                      {STATUS_LABEL[l.status] ?? l.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500" style={{ color: l.card.faction.color }}>
                    {l.card.faction.name}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Qtd: {l.quantity} · Preco: ✨ {l.pricePerUnit} cada
                    {l.quantity > 1 && <span className="text-zinc-500"> (total {totalPrice})</span>}
                  </p>
                  {l.status === "SOLD" && l.buyer && (
                    <p className="text-xs text-emerald-400 mt-1">
                      Vendida para <strong>{l.buyer.username}</strong>
                    </p>
                  )}
                </div>
                {l.status === "ACTIVE" && <CancelButton listingId={l.id} />}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}