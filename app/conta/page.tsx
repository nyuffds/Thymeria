// app/conta/page.tsx
// Página pessoal do jogador (e do admin também).
// Mostra saldo, info da conta e extrato das últimas 5 transações.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REASON_LABEL: Record<string, string> = {
  ADMIN_GRANT:      "Recompensa do GM",
  MATCH_REWARD:     "Recompensa de partida",
  BOOSTER_PURCHASE: "Compra de booster",
  CARD_SELL:        "Venda de carta",
  OTHER:            "Outro",
};

export default async function ContaPage() {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!user) redirect("/login");

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
      <h1 className="text-3xl font-bold text-amber-200 font-heading mb-2">Minha conta</h1>
      <p className="text-zinc-400 mb-8">Bem-vindo de volta, {user.username}.</p>

      {/* Saldo destaque */}
      <div className="bg-gradient-to-br from-amber-900/40 to-zinc-900/60 border border-amber-700/40 rounded-xl p-8 mb-6 text-center">
        <p className="text-xs uppercase tracking-wide text-amber-300/80 mb-2">Saldo</p>
        <p className="text-5xl font-bold font-mono text-amber-200">
          ✨ {user.coins}
        </p>
      </div>

      {/* Extrato */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
        <h2 className="text-lg font-bold text-amber-200 px-5 pt-5 pb-3">
          Últimas transações
        </h2>

        {user.transactions.length === 0 ? (
          <p className="px-5 pb-5 text-zinc-500 text-sm italic">
            Nenhuma transação ainda. Aguarde uma recompensa do GM ou abra um booster.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {user.transactions.map((t) => (
              <li key={t.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-200 text-sm">
                    {REASON_LABEL[t.reason] ?? t.reason}
                  </p>
                  {t.note && (
                    <p className="text-xs text-zinc-500 italic truncate">{t.note}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-mono font-semibold ${t.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {t.amount >= 0 ? "+" : ""}{t.amount}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {new Date(t.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-zinc-600 mt-4 text-center">
        <Link href="/cartas" className="hover:text-amber-200">Ver catálogo de cartas →</Link>
      </p>
    </main>
  );
}