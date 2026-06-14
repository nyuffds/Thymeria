"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { acceptTradeOfferAction } from "../_actions";

interface Props {
  offerId: string;
  hasEnoughCoins: boolean;
}

export function AcceptTradeButton({ offerId, hasEnoughCoins }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    if (!confirm("Aceitar esta oferta de troca?")) return;
    setError(null);
    startTransition(async () => {
      try {
        await acceptTradeOfferAction(offerId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro.");
      }
    });
  }

  if (!hasEnoughCoins) {
    return <span className="text-xs text-rose-400 italic">Moedas insuficientes</span>;
  }

  return (
    <div>
      <button
        onClick={handleAccept}
        disabled={isPending}
        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-emerald-100 text-sm font-bold rounded transition disabled:opacity-50"
      >
        {isPending ? "Aceitando..." : "Aceitar troca"}
      </button>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}