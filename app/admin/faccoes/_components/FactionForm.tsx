// app/admin/faccoes/_components/FactionForm.tsx
// Formulário reutilizável: cria nova facção ou edita existente.

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createFactionAction,
  updateFactionAction,
  deleteFactionAction,
} from "@/lib/actions";

type Mode =
  | { mode: "create" }
  | {
      mode: "edit";
      id: string;
      initial: {
        name: string;
        color: string;
        description: string;
        isActive: boolean;
      };
    };

export function FactionForm(props: Mode) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = props.mode === "edit";
  const init = isEdit ? props.initial : { name: "", color: "#c9a961", description: "", isActive: true };

  const [name, setName]               = useState(init.name);
  const [color, setColor]             = useState(init.color);
  const [description, setDescription] = useState(init.description);
  const [isActive, setIsActive]       = useState(init.isActive);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateFactionAction(props.id, { name, color, description, isActive });
        } else {
          await createFactionAction({ name, color, description });
        }
        router.push("/admin/faccoes");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm(`Excluir a facção "${name}"? Isto não pode ser desfeito.`)) return;
    setError(null);

    startTransition(async () => {
      try {
        await deleteFactionAction(props.id);
        router.push("/admin/faccoes");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao excluir.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div>
        <label className="block text-sm text-zinc-300 mb-2">Nome</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                     text-zinc-100 focus:outline-none focus:border-amber-500"
        />
      </div>

      <div>
        <label className="block text-sm text-zinc-300 mb-2">Cor temática</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={isPending}
            className="h-10 w-16 bg-zinc-800 border border-zinc-700 rounded cursor-pointer"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={isPending}
            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-zinc-100 font-mono text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-zinc-300 mb-2">Descrição / Lore</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          rows={3}
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                     text-zinc-100 focus:outline-none focus:border-amber-500"
          placeholder="Opcional"
        />
      </div>

      {isEdit && (
        <div>
          <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isPending}
              className="w-4 h-4 accent-amber-500"
            />
            Facção ativa (disponível para uso em cartas)
          </label>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin/faccoes")}
            disabled={isPending}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50
                       text-zinc-950 font-semibold px-6 py-2 rounded-lg transition"
          >
            {isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar facção"}
          </button>
        </div>

        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="text-red-400 hover:text-red-300 text-sm transition disabled:opacity-50"
          >
            Excluir facção
          </button>
        )}
      </div>
    </form>
  );
}