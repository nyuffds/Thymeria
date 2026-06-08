export const dynamic = "force-dynamic";

// app/admin/boosters/page.tsx
import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { RARITIES } from "@/lib/constants";

const prisma = new PrismaClient();

export default async function BoostersListPage() {
  const boosters = await prisma.booster.findMany({
    orderBy: { name: "asc" },
    include: {
      rules: { include: { card: { select: { name: true } } } },
      _count: { select: { openings: true } },
    },
  });

  function totalCards(rules: typeof boosters[number]["rules"]) {
    return rules.reduce((sum, r) => sum + r.quantity, 0);
  }

  function ruleSummary(rule: typeof boosters[number]["rules"][number]) {
    if (rule.mode === "FIXED_POOL") {
      return `${rule.quantity}× ${rule.card?.name ?? "?"}`;
    }
    if (rule.mode === "WEIGHTED") {
      return `${rule.quantity}x pesos custom`;
    }
    const rarityLabel = RARITIES.find((r) => r.key === rule.rarity)?.label ?? rule.rarity ?? "?";
    return `${rule.quantity}× ${rarityLabel}`;
  }

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin" className="text-sm text-zinc-500 hover:text-amber-200">
            ← Painel
          </Link>
          <h1 className="text-3xl font-bold text-amber-200 mt-1 font-heading">Boosters</h1>
        </div>
        <Link
          href="/admin/boosters/novo"
          className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-4 py-2 rounded-lg transition"
        >
          + Novo Booster
        </Link>
      </div>

      {boosters.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-12 text-center text-zinc-500">
          <p className="mb-4">Nenhum booster cadastrado ainda.</p>
          <Link
            href="/admin/boosters/novo"
            className="text-amber-300 hover:text-amber-200 underline"
          >
            Criar o primeiro →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {boosters.map((b) => (
            <Link
              key={b.id}
              href={`/admin/boosters/${b.id}`}
              className="block bg-zinc-900/60 border border-zinc-800 hover:border-amber-700 rounded-xl p-5 transition"
            >
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-lg font-bold text-zinc-100 font-heading">{b.name}</h2>
                <div className="text-right">
                  <p className="text-amber-300 font-mono font-bold">✨ {b.price}</p>
                  {!b.isActive && (
                    <p className="text-xs text-zinc-500 italic">inativo</p>
                  )}
                </div>
              </div>

              {b.description && (
                <p className="text-sm text-zinc-400 italic mb-3 font-lore">{b.description}</p>
              )}

              <div className="text-xs text-zinc-500 mb-2">
                {totalCards(b.rules)} cartas no total · {b._count.openings} aberturas
              </div>

              <ul className="text-xs text-zinc-400 space-y-0.5">
                {b.rules.map((r) => (
                  <li key={r.id}>
                    <span className={r.mode === "FIXED_POOL" ? "text-amber-400" : "text-purple-400"}>
                      {r.mode === "FIXED_POOL" ? "● " : "○ "}
                    </span>
                    {ruleSummary(r)}
                  </li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}