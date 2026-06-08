"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLobbyAction } from "@/lib/lobby-actions";

export function CreateLobbyButton({ hasOpenLobby }: { hasOpenLobby: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createLobbyAction();
        router.push("/partidas/" + result.matchId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao criar lobby.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleCreate}
        disabled={isPending || hasOpenLobby}
        className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50
                   text-zinc-950 font-semibold px-4 py-2 rounded-lg transition"
        title={hasOpenLobby ? "Você já tem um lobby aberto" : "Criar uma sala nova"}
      >
        {isPending ? "Criando..." : "+ Criar sala"}
      </button>
      {error && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded px-2 py-1">
          {error}
        </p>
      )}
    </div>
  );
}