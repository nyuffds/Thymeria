"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateGameSettingsAction } from "@/lib/actions";
import { RARITIES } from "@/lib/constants";

interface Props {
  initial: {
    sellPriceCommon: number;
    sellPriceRare: number;
    sellPriceEpic: number;
    sellPriceLegendary: number;
    maxPerDeckCommon: number;
    maxPerDeckRare: number;
    maxPerDeckEpic: number;
    maxPerDeckLegendary: number;
    allowSellLastCopy: boolean;
    pityThresholdCommon: number;
    pityThresholdRare: number;
    pityThresholdEpic: number;
    pityThresholdLegendary: number;
  };
}

export function SettingsForm({ initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [v, setV] = useState(initial);

  function update<K extends keyof typeof initial>(key: K, value: typeof initial[K]) {
    setV((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await updateGameSettingsAction(v);
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  }

  const rarityRows = [
    {
      label: "Comum",    color: RARITIES[0].color,
      sellKey: "sellPriceCommon" as const,
      deckKey: "maxPerDeckCommon" as const,
      pityKey: "pityThresholdCommon" as const,
    },
    {
      label: "Rara",     color: RARITIES[1].color,
      sellKey: "sellPriceRare" as const,
      deckKey: "maxPerDeckRare" as const,
      pityKey: "pityThresholdRare" as const,
    },
    {
      label: "Épica",    color: RARITIES[2].color,
      sellKey: "sellPriceEpic" as const,
      deckKey: "maxPerDeckEpic" as const,
      pityKey: "pityThresholdEpic" as const,
    },
    {
      label: "Lendária", color: RARITIES[3].color,
      sellKey: "sellPriceLegendary" as const,
      deckKey: "maxPerDeckLegendary" as const,
      pityKey: "pityThresholdLegendary" as const,
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-lg font-bold text-amber-200 mb-1">Por raridade</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Valores padrão. Cada carta pode sobrescrever venda e limite individualmente.
          Pity: após X cartas repetidas dessa raridade, próxima é garantida nova.
        </p>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-zinc-400 border-b border-zinc-800">
              <th className="text-left py-2">Raridade</th>
              <th className="text-center py-2">Venda (moedas)</th>
              <th className="text-center py-2">Máx. no deck</th>
              <th className="text-center py-2">Pity (X repetidas)</th>
            </tr>
          </thead>
          <tbody>
            {rarityRows.map((r) => (
              <tr key={r.label} className="border-b border-zinc-800/50 last:border-0">
                <td className="py-3" style={{ color: r.color }}>{r.label}</td>
                <td className="py-3 text-center">
                  <input
                    type="number"
                    min={0}
                    value={v[r.sellKey]}
                    onChange={(e) => update(r.sellKey, parseInt(e.target.value, 10) || 0)}
                    disabled={isPending}
                    className="w-24 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded
                               text-zinc-100 text-center focus:outline-none focus:border-amber-500"
                  />
                </td>
                <td className="py-3 text-center">
                  <input
                    type="number"
                    min={1}
                    value={v[r.deckKey]}
                    onChange={(e) => update(r.deckKey, parseInt(e.target.value, 10) || 1)}
                    disabled={isPending}
                    className="w-24 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded
                               text-zinc-100 text-center focus:outline-none focus:border-amber-500"
                  />
                </td>
                <td className="py-3 text-center">
                  <input
                    type="number"
                    min={1}
                    value={v[r.pityKey]}
                    onChange={(e) => update(r.pityKey, parseInt(e.target.value, 10) || 1)}
                    disabled={isPending}
                    className="w-24 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded
                               text-zinc-100 text-center focus:outline-none focus:border-amber-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-lg font-bold text-amber-200 mb-4">Política de venda</h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={v.allowSellLastCopy}
            onChange={(e) => update("allowSellLastCopy", e.target.checked)}
            disabled={isPending}
            className="w-4 h-4 mt-1 accent-amber-500"
          />
          <span>
            <span className="text-zinc-200">Permitir vender a última cópia de uma carta</span>
            <span className="block text-xs text-zinc-500 mt-0.5">
              Se desmarcado, o jogador sempre mantém pelo menos 1 cópia de cada carta que possui.
            </span>
          </span>
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded px-3 py-2">
          ✓ Configurações salvas.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50
                   text-zinc-950 font-semibold px-6 py-2 rounded-lg transition"
      >
        {isPending ? "Salvando..." : "Salvar configurações"}
      </button>
    </form>
  );
}