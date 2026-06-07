"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CardPreview, CardPreviewData } from "@/app/components/CardPreview";
import { RARITIES, CARD_TYPES, ROWS } from "@/lib/constants";
import { sellCardAction } from "@/lib/actions";

interface Props {
  card: CardPreviewData & { id: string };
  quantity: number;
  unitPrice: number;
  allowSellLastCopy: boolean;
}

export function CardDetailWithSell({ card, quantity, unitPrice, allowSellLastCopy }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sellQty, setSellQty] = useState("1");

  const rarity = RARITIES.find((r) => r.key === card.rarity);
  const cardType = CARD_TYPES.find((t) => t.key === card.cardType);
  const rowLabels = card.rows.split(",").filter(Boolean)
    .map((r) => ROWS.find((x) => x.key === r)?.label ?? r);

  const maxSellable = allowSellLastCopy ? quantity : quantity - 1;
  const sellQtyNum = parseInt(sellQty, 10) || 0;
  const totalValue = sellQtyNum * unitPrice;

  function handleSell() {
    setError(null);
    setFeedback(null);

    if (sellQtyNum < 1) {
      setError("Informe uma quantidade válida.");
      return;
    }
    if (sellQtyNum > maxSellable) {
      setError(`Você só pode vender até ${maxSellable} cópia(s).`);
      return;
    }
    if (!confirm(`Vender ${sellQtyNum}× ${card.name} por ✨ ${totalValue}?`)) return;

    startTransition(async () => {
      try {
        const result = await sellCardAction({ cardId: card.id, quantity: sellQtyNum });
        setFeedback(`Vendido! +✨ ${result.coinsGained}`);
        setSellQty("1");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao vender.");
      }
    });
  }

  const canSell = maxSellable > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 mt-4 items-start">
      {/* Carta */}
      <div className="flex justify-center relative">
        <div style={{ transform: "scale(1.4)", transformOrigin: "top center" }}>
          <CardPreview card={card} />
        </div>
        <span className="absolute -top-3 -right-3 bg-amber-500 text-zinc-950 font-bold text-lg px-3 py-1.5 rounded-full shadow-xl border-2 border-zinc-950 z-10">
          ×{quantity}
        </span>
      </div>

      {/* Painel de info + venda */}
      <div className="space-y-6 md:mt-12 md:pl-16">
        <div>
          <h1 className="font-heading text-4xl font-bold text-amber-200">{card.name}</h1>
          <p className="font-lore italic text-lg mt-1" style={{ color: card.faction.color }}>
            {card.faction.name}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase text-zinc-500">Poder</p>
            <p className="text-zinc-100 font-mono text-xl">{card.power}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-zinc-500">Tipo</p>
            <p className="text-zinc-100">{cardType?.label ?? card.cardType}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-zinc-500">Raridade</p>
            <p style={{ color: rarity?.color ?? "#fff" }}>{rarity?.label ?? card.rarity}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-zinc-500">Fileiras</p>
            <p className="text-zinc-100">{rowLabels.join(", ")}</p>
          </div>
        </div>

        {card.ability && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs uppercase text-amber-400 mb-1">⚡ {card.ability.name}</p>
            <p className="text-zinc-200">{card.ability.description}</p>
          </div>
        )}

        {card.loreText && (
          <div className="bg-parchment p-6 rounded-xl border-2" style={{ borderColor: "var(--bronze)" }}>
            <p className="font-lore italic text-lg text-[var(--ink)] leading-relaxed text-center">
              &ldquo;{card.loreText}&rdquo;
            </p>
          </div>
        )}

        {/* Painel de venda */}
        <div className="bg-zinc-900/60 border border-amber-700/30 rounded-xl p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-heading text-lg text-amber-200">Vender cópias</h2>
            <p className="text-xs text-zinc-500">
              ✨ {unitPrice} por unidade
            </p>
          </div>

          {!canSell ? (
            <p className="text-sm text-zinc-500 italic">
              {quantity === 1 && !allowSellLastCopy
                ? "Esta é sua única cópia. O GM desabilitou venda de últimas cópias."
                : "Sem cópias disponíveis para venda."}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <label className="text-sm text-zinc-300">Quantidade:</label>
                <input
                  type="number"
                  min={1}
                  max={maxSellable}
                  value={sellQty}
                  onChange={(e) => setSellQty(e.target.value)}
                  disabled={isPending}
                  className="w-20 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded
                             text-zinc-100 text-center focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-zinc-500">(máx {maxSellable})</span>
                <button
                  type="button"
                  onClick={() => setSellQty(maxSellable.toString())}
                  disabled={isPending}
                  className="text-xs text-amber-400 hover:text-amber-300"
                >
                  Máximo
                </button>
              </div>

              <p className="text-sm text-zinc-300 mb-3">
                Total: <span className="font-mono text-amber-300 font-bold">✨ {totalValue}</span>
              </p>

              {error && (
                <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2 mb-3">
                  {error}
                </p>
              )}
              {feedback && !error && (
                <p className="text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900 rounded px-3 py-2 mb-3">
                  ✓ {feedback}
                </p>
              )}

              <button
                onClick={handleSell}
                disabled={isPending || sellQtyNum < 1 || sellQtyNum > maxSellable}
                className="bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-500
                           text-zinc-950 font-semibold px-5 py-2 rounded-lg transition"
              >
                {isPending ? "Vendendo..." : "Vender"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}