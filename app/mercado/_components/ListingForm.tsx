"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createListingAction } from "../_actions";

interface CardItem {
  cardId: string;
  name: string;
  quantity: number;
  rarity: string;
  factionName: string;
  factionColor: string;
  imageUrl: string | null;
}

interface Props {
  cards: CardItem[];
}

const RARITY_COLOR: Record<string, string> = {
  COMMON: "#9ca3af",
  UNCOMMON: "#34d399",
  RARE: "#60a5fa",
  EPIC: "#a78bfa",
  LEGENDARY: "#fbbf24",
};

export function ListingForm({ cards }: Props) {
  const router = useRouter();
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [pricePerUnit, setPricePerUnit] = useState<number>(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selected = cards.find((c) => c.cardId === selectedCardId);
  const maxQty = selected?.quantity ?? 1;

  function handleSubmit() {
    if (!selectedCardId) { setError("Selecione uma carta."); return; }
    if (quantity < 1 || quantity > maxQty) { setError(`Quantidade entre 1 e ${maxQty}.`); return; }
    if (pricePerUnit < 0) { setError("Preco invalido."); return; }
    setError(null);
    startTransition(async () => {
      try {
        await createListingAction({ cardId: selectedCardId, quantity, pricePerUnit });
        router.push("/mercado/minhas");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm text-zinc-300 mb-2">Carta</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-auto p-2 bg-zinc-950 border border-zinc-800 rounded">
          {cards.map((c) => {
            const isSelected = c.cardId === selectedCardId;
            return (
              <button
                key={c.cardId}
                type="button"
                onClick={() => { setSelectedCardId(c.cardId); setQuantity(1); }}
                className={
                  "text-left p-2 rounded border-2 transition " +
                  (isSelected ? "bg-amber-900/30" : "bg-zinc-900/50 hover:bg-zinc-900")
                }
                style={{ borderColor: isSelected ? "#d97706" : c.factionColor + "55" }}
              >
                <div className="flex items-center gap-2">
                  {c.imageUrl && (
                    <img src={c.imageUrl} alt={c.name} className="w-10 h-14 rounded object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-amber-200 truncate">{c.name}</p>
                    <p className="text-xs" style={{ color: c.factionColor }}>{c.factionName}</p>
                    <p className="text-xs" style={{ color: RARITY_COLOR[c.rarity] ?? "#9ca3af" }}>
                      {c.rarity} - x{c.quantity}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-300 mb-1">Quantidade</label>
              <input
                type="number"
                min={1}
                max={maxQty}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(maxQty, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 text-zinc-200 rounded"
              />
              <p className="text-xs text-zinc-500 mt-1">Voce tem {maxQty} desta carta.</p>
            </div>
            <div>
              <label className="block text-sm text-zinc-300 mb-1">Preco por unidade</label>
              <input
                type="number"
                min={0}
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 text-zinc-200 rounded"
              />
              <p className="text-xs text-zinc-500 mt-1">Use 0 para oferta gratis.</p>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 text-sm">
            <p className="text-zinc-400">
              Total ao vender: <strong className="text-amber-300 font-mono">{quantity * pricePerUnit} moedas</strong>
              <span className="text-xs text-zinc-500 ml-2">(menos taxa do mercado)</span>
            </p>
          </div>
        </>
      )}

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          onClick={handleSubmit}
          disabled={isPending || !selected}
          className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold rounded transition disabled:opacity-50"
        >
          {isPending ? "Listando..." : "Listar no mercado"}
        </button>
      </div>
    </div>
  );
}