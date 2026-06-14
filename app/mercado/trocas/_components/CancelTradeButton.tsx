"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { cancelTradeOfferAction } from "../_actions";

export function CancelTradeButton({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    if (!confirm("Cancelar a oferta? Suas cartas e moedas voltam para voce.")) return;
    setError(null);
    startTransition(async () => {
      try {
        await cancelTradeOfferAction(offerId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro.");
      }
    });
  }

  return (
    <div>
      <button
        onClick={handleCancel}
        disabled={isPending}
        className="px-3 py-1.5 bg-rose-900 hover:bg-rose-800 text-rose-100 text-xs font-bold rounded transition disabled:opacity-50"
      >
        {isPending ? "Cancelando..." : "Cancelar oferta"}
      </button>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}