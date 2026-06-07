// app/loja/page.tsx
// Loja de boosters: lista boosters ativos com botão de compra.

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { BoosterCard } from "./_components/BoosterCard";
import { RARITIES } from "@/lib/constants";

const prisma = new PrismaClient();

export default async function LojaPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const [user, boosters] = await Promise.all([
    prisma.user.findUnique({
      where: { username: session.user.name },
      select: { id: true, coins: true },
    }),
    prisma.booster.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
      include: {
        rules: { include: { card: { select: { name: true } } } },
        _count: { select: { unopened: true } },
      },
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-amber-200 font-heading">Loja</h1>
          <p className="text-sm text-zinc-400 mt-1 font-lore italic">
            Pacotes de cartas dos confins de Thymeria.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase text-zinc-500">Seu saldo</p>
          <p className="text-2xl font-bold font-mono text-amber-300">✨ {user.coins}</p>
          <Link href="/estante" className="text-xs text-amber-400 hover:text-amber-300">
            → Ver minha estante
          </Link>
        </div>
      </div>

      {boosters.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
          Nenhum booster disponível no momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boosters.map((b) => (
            <BoosterCard
              key={b.id}
              booster={{
                id: b.id,
                name: b.name,
                description: b.description,
                price: b.price,
                imageUrl: b.imageUrl,
                totalCards: b.rules.reduce((s, r) => s + r.quantity, 0),
                ruleSummary: b.rules.map((r) =>
                  r.mode === "FIXED_POOL"
                    ? `${r.quantity}× ${r.card?.name ?? "?"}`
                    : `${r.quantity}× ${RARITIES.find((x) => x.key === r.rarity)?.label ?? r.rarity}`
                ),
              }}
              userCoins={user.coins}
            />
          ))}
        </div>
      )}
    </main>
  );
}