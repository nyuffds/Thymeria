"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { buyListingAction } from "../_actions";

interface Props {
  listingId: string;
  canAfford: boolean;
  totalPrice: number;
}

export function BuyButton({ listingId, canAfford, totalPrice }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleBuy() {
    if (!confirm(totalPrice === 0 ? "Pegar carta gratis?" : `Comprar por ${totalPrice} moedas?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await buyListingAction(listingId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro.");
      }
    });
  }

  if (!canAfford) {
    return <span className="text-xs text-rose-400 italic">Moedas insuficientes</span>;
  }

  return (
    <div>
      <button
        onClick={handleBuy}
        disabled={isPending}
        className="w-full px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-bold rounded transition disabled:opacity-50"
      >
        {isPending ? "Comprando..." : (totalPrice === 0 ? "Pegar gratis" : "Comprar")}
      </button>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}