"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAuctionAction } from "@/app/leiloes/_actions";

interface Card {
  cardId: string;
  name: string;
  rarity: string;
  factionName: string;
  factionColor: string;
  imageUrl: string | null;
}

const RARITY_COLOR: Record<string, string> = {
  COMMON: "#9ca3af", UNCOMMON: "#34d399", RARE: "#60a5fa", EPIC: "#a78bfa", LEGENDARY: "#fbbf24",
};

const DURATIONS = [
  { value: 60, label: "1 minuto" },
  { value: 180, label: "3 minutos" },
  { value: 300, label: "5 minutos" },
];

export function CreateAuctionForm({ cards }: { cards: Card[] }) {
  const router = useRouter();
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [minBid, setMinBid] = useState<string>("0");
  const [duration, setDuration] = useState<number>(60);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = search.trim()
    ? cards.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    : cards;

  function handleSubmit() {
    if (!selectedCardId) { setError("Selecione uma carta."); return; }
    const q = parseInt(quantity, 10);
    const m = parseInt(minBid, 10);
    if (Number.isNaN(q) || q < 1) { setError("Quantidade invalida."); return; }
    if (Number.isNaN(m) || m < 0) { setError("Lance minimo invalido."); return; }
    setError(null);
    startTransition(async () => {
      try {
        await createAuctionAction({ cardId: selectedCardId, quantity: q, minBid: m, durationSeconds: duration });
        router.push("/admin/leiloes");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm text-zinc-300 mb-2">Carta</label>
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 text-zinc-200 rounded mb-2"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-auto p-2 bg-zinc-950 border border-zinc-800 rounded">
          {filtered.slice(0, 50).map((c) => {
            const isSelected = c.cardId === selectedCardId;
            return (
              <button
                key={c.cardId} type="button" onClick={() => setSelectedCardId(c.cardId)}
                className={
                  "text-left p-2 rounded border-2 transition " +
                  (isSelected ? "bg-amber-900/30" : "bg-zinc-900/50 hover:bg-zinc-900")
                }
                style={{ borderColor: isSelected ? "#d97706" : c.factionColor + "55" }}
              >
                <div className="flex items-center gap-2">
                  {c.imageUrl && <img src={c.imageUrl} alt={c.name} className="w-10 h-14 rounded object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: RARITY_COLOR[c.rarity] ?? "#e5e7eb" }}>{c.name}</p>
                    <p className="text-xs" style={{ color: c.factionColor }}>{c.factionName}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Quantidade</label>
          <input
            type="number" min={1} value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 text-zinc-200 rounded"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Lance minimo</label>
          <input
            type="number" min={0} value={minBid}
            onChange={(e) => setMinBid(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 text-zinc-200 rounded"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Duracao</label>
          <select
            value={duration} onChange={(e) => setDuration(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 text-zinc-200 rounded"
          >
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <div className="flex justify-end">
        <button
          onClick={handleSubmit} disabled={isPending}
          className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold rounded transition disabled:opacity-50"
        >
          {isPending ? "Criando..." : "Iniciar leilao"}
        </button>
      </div>
    </div>
  );
}