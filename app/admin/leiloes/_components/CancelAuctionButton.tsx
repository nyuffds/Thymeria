"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { cancelAuctionAction } from "@/app/leiloes/_actions";

export function CancelAuctionButton({ auctionId }: { auctionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    if (!confirm("Cancelar este leilao? Lances serao descartados.")) return;
    setError(null);
    startTransition(async () => {
      try {
        await cancelAuctionAction(auctionId);
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
        className="px-3 py-1.5 bg-rose-900 hover:bg-rose-800 text-rose-100 text-xs font-bold rounded transition disabled:opacity-50 w-full"
      >
        {isPending ? "..." : "Cancelar"}
      </button>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}