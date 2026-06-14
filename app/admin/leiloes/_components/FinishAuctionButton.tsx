"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { finishAuctionAction } from "@/app/leiloes/_actions";

export function FinishAuctionButton({ auctionId }: { auctionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFinish() {
    if (!confirm("Encerrar este leilao agora? O maior lance ganha.")) return;
    setError(null);
    startTransition(async () => {
      try {
        await finishAuctionAction(auctionId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro.");
      }
    });
  }

  return (
    <div>
      <button
        onClick={handleFinish}
        disabled={isPending}
        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-emerald-100 text-xs font-bold rounded transition disabled:opacity-50 w-full"
      >
        {isPending ? "..." : "Encerrar"}
      </button>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}