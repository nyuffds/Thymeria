// app/loja/_components/BoosterCard.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buyBoosterAction } from "@/lib/actions";

interface Props {
  booster: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    totalCards: number;
    ruleSummary: string[];
  };
  userCoins: number;
}

export function BoosterCard({ booster, userCoins }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const canAfford = userCoins >= booster.price;

  function handleBuy() {
    setError(null);
    setFeedback(null);
    if (!confirm(`Comprar "${booster.name}" por ✨ ${booster.price}?`)) return;

    startTransition(async () => {
      try {
        await buyBoosterAction(booster.id);
        setFeedback("Booster adicionado à sua estante!");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro na compra.");
      }
    });
  }

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
      {/* Arte / placeholder */}
      <div
        className="aspect-[4/3] bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center"
        style={booster.imageUrl ? {
          backgroundImage: `url(${booster.imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        } : {}}
      >
        {!booster.imageUrl && <span className="text-6xl text-zinc-700">📦</span>}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-heading font-bold text-lg text-amber-200">{booster.name}</h3>
        {booster.description && (
          <p className="font-lore italic text-sm text-zinc-400 mt-1">{booster.description}</p>
        )}

        <div className="mt-3 text-xs text-zinc-500">
          <p className="mb-1">{booster.totalCards} cartas:</p>
          <ul className="space-y-0.5">
            {booster.ruleSummary.map((r, i) => (
              <li key={i} className="text-zinc-400">• {r}</li>
            ))}
          </ul>
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-400 bg-red-950/40 border border-red-900 rounded px-2 py-1">
            {error}
          </p>
        )}
        {feedback && !error && (
          <p className="mt-3 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded px-2 py-1">
            ✓ {feedback}
          </p>
        )}

        <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between">
          <span className="font-mono text-amber-300 font-bold">✨ {booster.price}</span>
          <button
            onClick={handleBuy}
            disabled={isPending || !canAfford}
            className="bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-500
                       disabled:cursor-not-allowed text-zinc-950 font-semibold px-4 py-1.5 rounded text-sm transition"
          >
            {isPending ? "..." : canAfford ? "Comprar" : "Saldo insuficiente"}
          </button>
        </div>
      </div>
    </div>
  );
}