"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { placeBidAction } from "../_actions";

interface Props {
  auctionId: string;
  cardName: string;
  cardImageUrl: string | null;
  factionName: string;
  factionColor: string;
  rarity: string;
  quantity: number;
  minBid: number;
  durationSeconds: number;
  endsAt: string;
  bidCount: number;
  myBid: number | null;
  myCoins: number;
  isAdmin: boolean;
}

const RARITY_COLOR: Record<string, string> = {
  COMMON: "#9ca3af", UNCOMMON: "#34d399", RARE: "#60a5fa", EPIC: "#a78bfa", LEGENDARY: "#fbbf24",
};

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Encerrado";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m < 1) return s + "s";
  return m + "m" + (s - m * 60).toString().padStart(2, "0") + "s";
}

export function AuctionCard(props: Props) {
  const router = useRouter();
  const [now, setNow] = useState<number>(Date.now());
  const [bidAmount, setBidAmount] = useState<string>(props.minBid.toString());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const endsAtMs = new Date(props.endsAt).getTime();
  const remaining = endsAtMs - now;
  const expired = remaining <= 0;

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  function handleBid() {
    const value = parseInt(bidAmount, 10);
    if (Number.isNaN(value)) { setError("Digite um valor valido."); return; }
    if (value < props.minBid) { setError(`Lance minimo: ${props.minBid}`); return; }
    if (value > props.myCoins) { setError("Voce nao tem moedas suficientes."); return; }
    if (!confirm(`Dar lance de ${value} moedas? Lance e final, nao podera mudar depois.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await placeBidAction(props.auctionId, value);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro.");
      }
    });
  }

  const alreadyBid = props.myBid !== null;

  return (
    <article
      className="rounded-lg border-2 bg-zinc-900/60 p-4"
      style={{ borderColor: props.factionColor + "55" }}
    >
      <div className="flex gap-3 mb-3">
        {props.cardImageUrl && (
          <img src={props.cardImageUrl} alt={props.cardName} className="w-16 h-24 rounded object-cover flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold font-heading truncate" style={{ color: RARITY_COLOR[props.rarity] ?? "#e5e7eb" }}>
            {props.cardName}
          </h2>
          <p className="text-xs" style={{ color: props.factionColor }}>{props.factionName}</p>
          <p className="text-xs text-zinc-500 mt-1">Qtd: {props.quantity}</p>
          <p className="text-xs text-zinc-500">Lance minimo: \u2728 {props.minBid}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs mb-3 bg-zinc-950/60 rounded px-2 py-1">
        <span className="text-zinc-400">Termina em:</span>
        <span className={"font-mono " + (expired ? "text-rose-400" : remaining < 30000 ? "text-amber-300" : "text-zinc-200")}>
          {formatRemaining(remaining)}
        </span>
      </div>

      <div className="text-xs text-zinc-500 mb-3">
        Lances recebidos: <strong className="text-zinc-300">{props.bidCount}</strong>
      </div>

      {alreadyBid ? (
        <div className="text-xs px-2 py-1 rounded bg-emerald-900/30 border border-emerald-700/50 text-emerald-300">
          Seu lance: \u2728 {props.myBid}
          <p className="text-zinc-500 mt-1">Aguarde o encerramento.</p>
        </div>
      ) : expired ? (
        <p className="text-xs text-zinc-500 italic">Aguardando admin encerrar.</p>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="number"
              min={props.minBid}
              max={props.myCoins}
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder={"min: " + props.minBid}
              className="flex-1 px-2 py-1 bg-zinc-950 border border-zinc-700 text-zinc-200 rounded text-sm"
            />
            <button
              onClick={handleBid}
              disabled={isPending}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-bold rounded transition disabled:opacity-50"
            >
              {isPending ? "..." : "Dar lance"}
            </button>
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>
      )}
    </article>
  );
}