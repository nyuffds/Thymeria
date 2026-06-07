// app/admin/economia/page.tsx
import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { AdjustCoinsForm } from "./_components/AdjustCoinsForm";

const prisma = new PrismaClient();

const REASON_LABEL: Record<string, string> = {
  ADMIN_GRANT:      "GM",
  MATCH_REWARD:     "Partida",
  BOOSTER_PURCHASE: "Booster",
  CARD_SELL:        "Venda",
  OTHER:            "Outro",
};

export default async function EconomiaPage() {
  const [players, transactions] = await Promise.all([
    prisma.user.findMany({
      where: { role: "PLAYER" },
      orderBy: { username: "asc" },
      select: { id: true, username: true, coins: true },
    }),
    prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { user: { select: { username: true } } },
    }),
  ]);

  const totalInCirculation = players.reduce((sum, p) => sum + p.coins, 0);

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <Link href="/admin" className="text-sm text-zinc-500 hover:text-amber-200">
        ← Painel
      </Link>
      <h1 className="text-3xl font-bold text-amber-200 mt-1 mb-2">Economia</h1>
      <p className="text-zinc-400 mb-6">
        Total em circulação: <span className="text-amber-300 font-mono">{totalInCirculation}</span> moedas
      </p>

      <div className="space-y-6">
        <AdjustCoinsForm users={players} />

        {/* Saldo de cada jogador */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-bold text-amber-200 mb-4">Saldos atuais</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {players.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2">
                <span className="text-zinc-200">{p.username}</span>
                <span className="font-mono text-amber-300">✨ {p.coins}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Extrato global recente */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
          <h2 className="text-lg font-bold text-amber-200 p-5 pb-3">Últimas transações</h2>
          {transactions.length === 0 ? (
            <p className="px-5 pb-5 text-zinc-500 text-sm">Nenhuma transação registrada ainda.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 border-y border-zinc-800">
                <tr className="text-xs uppercase text-zinc-400">
                  <th className="text-left px-4 py-2">Quando</th>
                  <th className="text-left px-4 py-2">Jogador</th>
                  <th className="text-right px-4 py-2">Valor</th>
                  <th className="text-left px-4 py-2">Motivo</th>
                  <th className="text-left px-4 py-2">Nota</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-4 py-2 text-zinc-500 text-xs">
                      {new Date(t.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-2 text-zinc-200">{t.user.username}</td>
                    <td className={`px-4 py-2 text-right font-mono ${t.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {t.amount >= 0 ? "+" : ""}{t.amount}
                    </td>
                    <td className="px-4 py-2 text-zinc-400 text-xs">{REASON_LABEL[t.reason] ?? t.reason}</td>
                    <td className="px-4 py-2 text-zinc-300 text-xs">{t.note ?? <span className="text-zinc-600 italic">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}