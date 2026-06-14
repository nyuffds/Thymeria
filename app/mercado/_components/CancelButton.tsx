"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { cancelListingAction } from "../_actions";

export function CancelButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    if (!confirm("Cancelar listagem? As cartas voltam para sua colecao.")) return;
    setError(null);
    startTransition(async () => {
      try {
        await cancelListingAction(listingId);
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
        {isPending ? "Cancelando..." : "Cancelar"}
      </button>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}