"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTradeOfferAction } from "../_actions";

interface MyCard {
  cardId: string;
  name: string;
  quantity: number;
  rarity: string;
  factionName: string;
  factionColor: string;
  imageUrl: string | null;
}

interface AllCard {
  cardId: string;
  name: string;
  rarity: string;
  factionName: string;
  factionColor: string;
  imageUrl: string | null;
}

interface Player {
  id: string;
  username: string;
}

interface Props {
  myCards: MyCard[];
  allCards: AllCard[];
  players: Player[];
  myCoins: number;
}

interface CartEntry { cardId: string; name: string; quantity: number; rarity: string; }

const RARITY_COLOR: Record<string, string> = {
  COMMON: "#9ca3af", UNCOMMON: "#34d399", RARE: "#60a5fa", EPIC: "#a78bfa", LEGENDARY: "#fbbf24",
};

export function TradeOfferForm({ myCards, allCards, players, myCoins }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [offeredCart, setOfferedCart] = useState<CartEntry[]>([]);
  const [demandedCart, setDemandedCart] = useState<CartEntry[]>([]);
  const [coinsOffered, setCoinsOffered] = useState(0);
  const [coinsDemanded, setCoinsDemanded] = useState(0);
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");

  function addOffered(card: MyCard) {
    const existing = offeredCart.find((c) => c.cardId === card.cardId);
    const max = card.quantity;
    if (existing) {
      if (existing.quantity >= max) return;
      setOfferedCart(offeredCart.map((c) => c.cardId === card.cardId ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setOfferedCart([...offeredCart, { cardId: card.cardId, name: card.name, rarity: card.rarity, quantity: 1 }]);
    }
  }

  function removeOffered(cardId: string) {
    setOfferedCart(offeredCart.filter((c) => c.cardId !== cardId));
  }

  function addDemanded(card: AllCard) {
    const existing = demandedCart.find((c) => c.cardId === card.cardId);
    if (existing) {
      setDemandedCart(demandedCart.map((c) => c.cardId === card.cardId ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setDemandedCart([...demandedCart, { cardId: card.cardId, name: card.name, rarity: card.rarity, quantity: 1 }]);
    }
  }

  function removeDemanded(cardId: string) {
    setDemandedCart(demandedCart.filter((c) => c.cardId !== cardId));
  }

  function handleSubmit() {
    if (offeredCart.length === 0 && coinsOffered === 0) { setError("Voce precisa oferecer ao menos uma carta ou moedas."); return; }
    if (demandedCart.length === 0 && coinsDemanded === 0) { setError("Voce precisa pedir ao menos uma carta ou moedas."); return; }
    if (coinsOffered > myCoins) { setError("Voce nao tem moedas suficientes."); return; }
    setError(null);
    startTransition(async () => {
      try {
        await createTradeOfferAction({
          offered:  offeredCart.map((c) => ({ cardId: c.cardId, quantity: c.quantity })),
          demanded: demandedCart.map((c) => ({ cardId: c.cardId, quantity: c.quantity })),
          coinsOffered, coinsDemanded,
          targetUserId: targetUserId || null,
          note: note.trim() || null,
        });
        router.push("/mercado/trocas/minhas");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro.");
      }
    });
  }

  const allCardsFiltered = search.trim()
    ? allCards.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    : allCards;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* OFEREÇO */}
        <section className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-4">
          <h2 className="text-sm font-bold text-emerald-300 uppercase tracking-wider mb-3">Eu ofereco</h2>

          <div className="mb-3">
            <label className="block text-xs text-zinc-400 mb-1">Moedas (max {myCoins})</label>
            <input
              type="number" min={0} max={myCoins} value={coinsOffered}
              onChange={(e) => setCoinsOffered(Math.max(0, Math.min(myCoins, parseInt(e.target.value) || 0)))}
              className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 text-zinc-200 rounded text-sm"
            />
          </div>

          <p className="text-xs text-zinc-400 mb-2">Cartas selecionadas:</p>
          {offeredCart.length === 0 ? (
            <p className="text-xs text-zinc-600 italic mb-3">Nenhuma carta selecionada</p>
          ) : (
            <ul className="space-y-1 mb-3">
              {offeredCart.map((c) => (
                <li key={c.cardId} className="flex items-center justify-between bg-zinc-900/60 rounded px-2 py-1 text-xs">
                  <span style={{ color: RARITY_COLOR[c.rarity] }}>{c.name} <span className="text-zinc-500">x{c.quantity}</span></span>
                  <button onClick={() => removeOffered(c.cardId)} className="text-rose-400 hover:text-rose-300">x</button>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-zinc-400 mb-1">Sua colecao (clique para adicionar):</p>
          <div className="grid grid-cols-1 gap-1 max-h-72 overflow-auto p-1 bg-zinc-950 border border-zinc-800 rounded">
            {myCards.length === 0 ? (
              <p className="text-xs text-zinc-600 italic p-2">Voce nao tem cartas.</p>
            ) : myCards.map((c) => {
              const inCart = offeredCart.find((o) => o.cardId === c.cardId);
              const remaining = c.quantity - (inCart?.quantity ?? 0);
              return (
                <button
                  key={c.cardId} type="button" onClick={() => addOffered(c)} disabled={remaining <= 0}
                  className="text-left p-1.5 rounded bg-zinc-900/50 hover:bg-zinc-900 transition text-xs disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {c.imageUrl && <img src={c.imageUrl} alt={c.name} className="w-6 h-9 rounded object-cover" />}
                  <span className="flex-1 truncate" style={{ color: RARITY_COLOR[c.rarity] }}>{c.name}</span>
                  <span className="text-zinc-500">x{remaining}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* PEÇO */}
        <section className="bg-rose-950/20 border border-rose-900/40 rounded-lg p-4">
          <h2 className="text-sm font-bold text-rose-300 uppercase tracking-wider mb-3">Eu peco</h2>

          <div className="mb-3">
            <label className="block text-xs text-zinc-400 mb-1">Moedas</label>
            <input
              type="number" min={0} value={coinsDemanded}
              onChange={(e) => setCoinsDemanded(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 text-zinc-200 rounded text-sm"
            />
          </div>

          <p className="text-xs text-zinc-400 mb-2">Cartas pedidas:</p>
          {demandedCart.length === 0 ? (
            <p className="text-xs text-zinc-600 italic mb-3">Nenhuma carta selecionada</p>
          ) : (
            <ul className="space-y-1 mb-3">
              {demandedCart.map((c) => (
                <li key={c.cardId} className="flex items-center justify-between bg-zinc-900/60 rounded px-2 py-1 text-xs">
                  <span style={{ color: RARITY_COLOR[c.rarity] }}>{c.name} <span className="text-zinc-500">x{c.quantity}</span></span>
                  <button onClick={() => removeDemanded(c.cardId)} className="text-rose-400 hover:text-rose-300">x</button>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-zinc-400 mb-1">Procurar carta (clique para adicionar):</p>
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-700 text-zinc-200 rounded text-sm mb-1"
          />
          <div className="grid grid-cols-1 gap-1 max-h-48 overflow-auto p-1 bg-zinc-950 border border-zinc-800 rounded">
            {allCardsFiltered.slice(0, 50).map((c) => (
              <button
                key={c.cardId} type="button" onClick={() => addDemanded(c)}
                className="text-left p-1.5 rounded bg-zinc-900/50 hover:bg-zinc-900 transition text-xs flex items-center gap-2"
              >
                {c.imageUrl && <img src={c.imageUrl} alt={c.name} className="w-6 h-9 rounded object-cover" />}
                <span className="flex-1 truncate" style={{ color: RARITY_COLOR[c.rarity] }}>{c.name}</span>
                <span className="text-zinc-500 text-[10px]" style={{ color: c.factionColor }}>{c.factionName}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Alvo + nota */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Direcionar a um jogador (opcional)</label>
          <select
            value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 text-zinc-200 rounded"
          >
            <option value="">Publica (qualquer um pode aceitar)</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.username}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-zinc-300 mb-1">Nota (opcional)</label>
          <input
            type="text" value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))}
            placeholder="Ex: Urgente! Troca para fechar deck"
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 text-zinc-200 rounded"
          />
        </div>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <div className="flex justify-end">
        <button
          onClick={handleSubmit} disabled={isPending}
          className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold rounded transition disabled:opacity-50"
        >
          {isPending ? "Criando..." : "Criar oferta"}
        </button>
      </div>
    </div>
  );
}