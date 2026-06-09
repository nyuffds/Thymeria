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

const MAX_QUANTITY = 50;

export function BoosterCard({ booster, userCoins }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const totalCost = booster.price * quantity;
  const canAfford = userCoins >= totalCost;
  const maxAffordable = Math.min(MAX_QUANTITY, Math.floor(userCoins / booster.price));

  function adjustQuantity(delta: number) {
    setError(null);
    setFeedback(null);
    setQuantity((q) => Math.max(1, Math.min(MAX_QUANTITY, q + delta)));
  }

  function handleBuy() {
    setError(null);
    setFeedback(null);
    const label = quantity === 1
      ? `Comprar "${booster.name}" por ✨ ${totalCost}?`
      : `Comprar ${quantity}x "${booster.name}" por ✨ ${totalCost}?`;
    if (!confirm(label)) return;

    startTransition(async () => {
      try {
        await buyBoosterAction(booster.id, quantity);
        setFeedback(
          quantity === 1
            ? "Booster adicionado à sua estante!"
            : `${quantity} boosters adicionados à sua estante!`
        );
        setQuantity(1);
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

        {/* Contador de quantidade */}
        <div className="mt-4 pt-3 border-t border-zinc-800 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Quantidade:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => adjustQuantity(-1)}
                disabled={isPending || quantity <= 1}
                className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-100 font-bold transition"
              >
                −
              </button>
              <span className="font-mono font-bold text-amber-200 w-8 text-center">{quantity}</span>
              <button
                onClick={() => adjustQuantity(1)}
                disabled={isPending || quantity >= MAX_QUANTITY}
                className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-100 font-bold transition"
              >
                +
              </button>
              {maxAffordable > 1 && quantity < maxAffordable && (
                <button
                  onClick={() => setQuantity(maxAffordable)}
                  disabled={isPending}
                  className="ml-1 text-[10px] uppercase tracking-wider text-amber-400 hover:text-amber-300 transition"
                  title={`Comprar ${maxAffordable} (m\u00e1ximo poss\u00edvel)`}
                >
                  Máx
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-mono text-amber-300 font-bold">
              ✨ {totalCost}
              {quantity > 1 && (
                <span className="text-xs text-zinc-500 ml-1">({booster.price} x {quantity})</span>
              )}
            </span>
            <button
              onClick={handleBuy}
              disabled={isPending || !canAfford}
              className="bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-zinc-950 font-semibold px-4 py-1.5 rounded text-sm transition"
            >
              {isPending ? "..." : canAfford ? "Comprar" : "Saldo insuficiente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}