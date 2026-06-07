// app/admin/boosters/_components/BoosterForm.tsx
// Formulário com lista dinâmica de regras de drop.

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createBoosterAction,
  updateBoosterAction,
  deleteBoosterAction,
  type BoosterRuleInput,
} from "@/lib/actions";
import { RARITIES } from "@/lib/constants";

interface CardOpt { id: string; name: string; rarity: string; }

type Mode =
  | { mode: "create"; cards: CardOpt[]; }
  | {
      mode: "edit";
      id: string;
      cards: CardOpt[];
      initial: {
        name: string;
        description: string;
        price: number;
        imageUrl: string;
        isActive: boolean;
        rules: BoosterRuleInput[];
      };
    };

function emptyRule(): BoosterRuleInput {
  return { mode: "BY_RARITY", rarity: "COMMON", cardId: null, quantity: 1 };
}

export function BoosterForm(props: Mode) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = props.mode === "edit";
  const init = isEdit
    ? props.initial
    : {
        name: "",
        description: "",
        price: 100,
        imageUrl: "",
        isActive: true,
        rules: [emptyRule()] as BoosterRuleInput[],
      };

  const [name, setName]               = useState(init.name);
  const [description, setDescription] = useState(init.description);
  const [price, setPrice]             = useState<string>(init.price.toString());
  const [imageUrl, setImageUrl]       = useState(init.imageUrl);
  const [isActive, setIsActive]       = useState(init.isActive);
  const [rules, setRules]             = useState<BoosterRuleInput[]>(init.rules);

  function updateRule(idx: number, patch: Partial<BoosterRuleInput>) {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function changeRuleMode(idx: number, newMode: "FIXED_POOL" | "BY_RARITY") {
    setRules((prev) => prev.map((r, i) => {
      if (i !== idx) return r;
      if (newMode === "FIXED_POOL") {
        return { mode: "FIXED_POOL", rarity: null, cardId: props.cards[0]?.id ?? null, quantity: r.quantity };
      }
      return { mode: "BY_RARITY", rarity: "COMMON", cardId: null, quantity: r.quantity };
    }));
  }

  function addRule() {
    setRules((prev) => [...prev, emptyRule()]);
  }

  function removeRule(idx: number) {
    setRules((prev) => prev.filter((_, i) => i !== idx));
  }

  const totalCards = rules.reduce((sum, r) => sum + (r.quantity || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const priceNum = parseInt(price, 10);
    const payload = {
      name,
      description,
      price: priceNum,
      imageUrl,
      rules,
    };

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateBoosterAction(props.id, { ...payload, isActive });
        } else {
          await createBoosterAction(payload);
        }
        router.push("/admin/boosters");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm(`Excluir o booster "${name}"? Isto não pode ser desfeito.`)) return;
    setError(null);

    startTransition(async () => {
      try {
        await deleteBoosterAction(props.id);
        router.push("/admin/boosters");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao excluir.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Bloco básico */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-300 mb-2">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-zinc-100 focus:outline-none focus:border-amber-500"
            placeholder="Ex: Pacote Valtres"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-zinc-300 mb-2">Preço (moedas)</label>
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={isPending}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                         text-zinc-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-300 mb-2">URL da arte (opcional)</label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              disabled={isPending}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                         text-zinc-100 font-mono text-xs focus:outline-none focus:border-amber-500"
              placeholder="https://..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-300 mb-2">Descrição (opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isPending}
            rows={2}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-zinc-100 focus:outline-none focus:border-amber-500"
            placeholder="Aparece pro jogador na loja."
          />
        </div>

        {isEdit && (
          <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isPending}
              className="w-4 h-4 accent-amber-500"
            />
            Booster ativo (disponível na loja)
          </label>
        )}
      </div>

      {/* Regras de drop */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-amber-200">Regras de drop</h3>
            <p className="text-xs text-zinc-500">
              Total: <span className="text-amber-300 font-mono">{totalCards}</span> cartas por booster
            </p>
          </div>
          <button
            type="button"
            onClick={addRule}
            disabled={isPending}
            className="text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded transition"
          >
            + Adicionar regra
          </button>
        </div>

        <div className="space-y-2">
          {rules.map((r, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 rounded-lg p-2"
            >
              {/* Modo */}
              <select
                value={r.mode}
                onChange={(e) => changeRuleMode(idx, e.target.value as "FIXED_POOL" | "BY_RARITY")}
                disabled={isPending}
                className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm
                           text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                <option value="BY_RARITY">Por raridade</option>
                <option value="FIXED_POOL">Carta fixa</option>
              </select>

              {/* Seleção dinâmica */}
              {r.mode === "BY_RARITY" ? (
                <select
                  value={r.rarity ?? ""}
                  onChange={(e) => updateRule(idx, { rarity: e.target.value })}
                  disabled={isPending}
                  className="flex-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm
                             text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  {RARITIES.map((rar) => (
                    <option key={rar.key} value={rar.key}>{rar.label}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={r.cardId ?? ""}
                  onChange={(e) => updateRule(idx, { cardId: e.target.value })}
                  disabled={isPending}
                  className="flex-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm
                             text-zinc-100 focus:outline-none focus:border-amber-500"
                >
                  {props.cards.length === 0 ? (
                    <option value="">— Crie cartas primeiro —</option>
                  ) : (
                    props.cards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({RARITIES.find((x) => x.key === c.rarity)?.label})
                      </option>
                    ))
                  )}
                </select>
              )}

              {/* Quantidade */}
              <input
                type="number"
                min={1}
                value={r.quantity}
                onChange={(e) => updateRule(idx, { quantity: parseInt(e.target.value, 10) || 1 })}
                disabled={isPending}
                className="w-16 px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm
                           text-zinc-100 text-center focus:outline-none focus:border-amber-500"
              />

              {/* Remover */}
              <button
                type="button"
                onClick={() => removeRule(idx)}
                disabled={isPending || rules.length === 1}
                className="text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed
                           text-xs px-2"
                title={rules.length === 1 ? "Booster precisa de pelo menos 1 regra" : "Remover"}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <p className="text-xs text-zinc-500 mt-3">
          <span className="text-purple-400">Por raridade</span> sorteia entre as cartas liberadas dessa raridade. <span className="text-amber-400">Carta fixa</span> garante sempre a carta escolhida.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin/boosters")}
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
            {isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar booster"}
          </button>
        </div>

        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="text-red-400 hover:text-red-300 text-sm transition disabled:opacity-50"
          >
            Excluir booster
          </button>
        )}
      </div>
    </form>
  );
}