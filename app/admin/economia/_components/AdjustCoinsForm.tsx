// app/admin/economia/_components/AdjustCoinsForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustCoinsAction } from "@/lib/actions";

interface User { id: string; username: string; coins: number; }

const REASONS = [
  { key: "ADMIN_GRANT",   label: "Recompensa do GM" },
  { key: "MATCH_REWARD",  label: "Recompensa de partida" },
  { key: "OTHER",         label: "Outro motivo" },
];

export function AdjustCoinsForm({ users }: { users: User[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("ADMIN_GRANT");
  const [note, setNote]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFeedback(null);

    const amountNum = parseInt(amount, 10);
    if (Number.isNaN(amountNum) || amountNum === 0) {
      setError("Informe um valor diferente de zero (use - para subtrair).");
      return;
    }

    const target = users.find((u) => u.id === userId);

    startTransition(async () => {
      try {
        await adjustCoinsAction({ userId, amount: amountNum, reason, note });
        setFeedback(
          `${amountNum > 0 ? "+" : ""}${amountNum} moedas → ${target?.username}.`
        );
        setAmount("");
        setNote("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao processar.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
      <h2 className="text-lg font-bold text-amber-200">Distribuir moedas</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs uppercase text-zinc-500 mb-1">Jogador</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={isPending}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded
                       text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username} ({u.coins})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase text-zinc-500 mb-1">
            Valor <span className="text-zinc-600">(- para tirar)</span>
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isPending}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded
                       text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
            placeholder="Ex: 100 ou -50"
          />
        </div>

        <div>
          <label className="block text-xs uppercase text-zinc-500 mb-1">Motivo</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isPending}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded
                       text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
          >
            {REASONS.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase text-zinc-500 mb-1">
          Nota (opcional, aparece no extrato do jogador)
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={isPending}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded
                     text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
          placeholder="Ex: Recompensa Sessão 14 — Resgate de Yenna"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
          {error}
        </p>
      )}
      {feedback && !error && (
        <p className="text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded px-3 py-2">
          ✓ {feedback}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50
                   text-zinc-950 font-semibold px-5 py-2 rounded-lg transition"
      >
        {isPending ? "Processando..." : "Aplicar"}
      </button>
    </form>
  );
}