"use client";

import { useState } from "react";

type Side = "A" | "B";

interface MatchEvent {
  id: string;
  type: string;
  side: Side | null;
  payload: string;
  createdAt: string;
}

interface Props {
  events: MatchEvent[];
  playerNames: Record<Side, string>;
  currentRound: number;
}

// Formata cada tipo de evento em texto humano
function formatEvent(ev: MatchEvent, playerNames: Record<Side, string>): { icon: string; text: string; color: string } | null {
  const actor = ev.side ? playerNames[ev.side] : null;
  let payload: Record<string, unknown> = {};
  try { payload = JSON.parse(ev.payload); } catch { /* ignore */ }

  switch (ev.type) {
    case "ROUND_START":
      return { icon: "▶", text: "Ronda " + (payload.round ?? "?") + " iniciada", color: "text-amber-300" };
    case "REDRAW":
      return { icon: "🔄", text: actor + " trocou " + payload.count + " carta(s)", color: "text-zinc-400" };
    case "REDRAW_SKIP":
      return { icon: "⏭", text: actor + " pulou o redraw", color: "text-zinc-500" };
    case "PLAY_CARD":
      return { icon: "🃏", text: actor + " jogou uma carta" + (payload.asSpy ? " (espião)" : ""), color: "text-zinc-300" };
    case "PASS":
      return { icon: "⏸", text: actor + " passou a vez", color: "text-amber-400" };
    case "BOOST":
      return { icon: "⬆", text: "+" + payload.amount + " de poder (reforço)", color: "text-emerald-400" };
    case "DAMAGE":
      return { icon: "💥", text: "Dano de " + payload.amount + " aplicado", color: "text-red-400" };
    case "DAMAGE_BLOCKED":
      return { icon: "🛡", text: "Dano bloqueado por escudo", color: "text-blue-400" };
    case "DESTROY":
      return { icon: "💀", text: "Carta destruída", color: "text-red-500" };
    case "HEAL":
      return { icon: "💚", text: "Carta restaurada", color: "text-emerald-400" };
    case "SPAWN":
      return { icon: "✨", text: payload.count + " token(s) invocado(s)", color: "text-purple-400" };
    case "DRAW":
      return { icon: "📥", text: actor + " comprou " + payload.count + " carta(s)", color: "text-cyan-400" };
    case "SPY_DRAW":
      return { icon: "🕵", text: actor + " infiltrou e comprou " + payload.count + " carta(s)", color: "text-purple-300" };
    case "WEATHER":
      return { icon: "⛈", text: "Clima aplicado", color: "text-blue-400" };
    case "LEADER_ABILITY":
      return { icon: "✦", text: actor + " ativou habilidade do líder", color: "text-purple-300" };
    case "ROUND_END":
      const w = payload.winner;
      const txt = w === "DRAW"
        ? "Ronda empatada (" + payload.powerA + " vs " + payload.powerB + ")"
        : "Ronda vencida por " + playerNames[w as Side] + " (" + payload.powerA + " vs " + payload.powerB + ")";
      return { icon: "🏆", text: txt, color: "text-amber-300 font-semibold" };
    case "MATCH_PAUSED":
      return { icon: "⏸", text: actor + " pausou a partida", color: "text-zinc-400" };
    case "MATCH_RESUMED":
      return { icon: "▶", text: actor + " retomou a partida", color: "text-emerald-400" };
    case "DRAW_OFFERED":
      return { icon: "🤝", text: actor + " ofereceu empate", color: "text-purple-300" };
    case "DRAW_ACCEPTED":
      return { icon: "✓", text: "Empate aceito", color: "text-purple-300" };
    case "DRAW_DECLINED":
      return { icon: "✗", text: "Empate recusado", color: "text-zinc-400" };
    case "MATCH_ABANDONED":
      return { icon: "🏳", text: actor + " abandonou a partida", color: "text-red-400" };
    default:
      return null;
  }
}

export function MatchEventLog({ events, playerNames, currentRound }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  // Ordena do mais recente em cima (reverse)
  const formatted = [...events].reverse()
    .map((e) => ({ ev: e, fmt: formatEvent(e, playerNames) }))
    .filter((x) => x.fmt !== null);

  return (
    <aside
      className={
        "bg-zinc-900/60 border border-zinc-800 rounded-xl transition-all " +
        (collapsed ? "w-12 overflow-hidden" : "w-64")
      }
    >
      <div className="flex items-center justify-between p-2 border-b border-zinc-800">
        {!collapsed && (
          <h2 className="font-heading text-xs uppercase tracking-wider text-amber-300">
            Ronda {currentRound}
          </h2>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-zinc-500 hover:text-amber-200 text-sm w-8 h-8 flex items-center justify-center"
          title={collapsed ? "Expandir log" : "Recolher log"}
        >
          {collapsed ? "▶" : "◀"}
        </button>
      </div>

      {!collapsed && (
        <div className="p-2 space-y-1 max-h-[600px] overflow-y-auto">
          {formatted.length === 0 ? (
            <p className="text-xs text-zinc-600 italic py-2 text-center">
              Sem eventos ainda.
            </p>
          ) : (
            formatted.map(({ ev, fmt }) => (
              <div
                key={ev.id}
                className={"flex items-start gap-1.5 text-xs py-0.5 " + (fmt!.color)}
              >
                <span className="flex-shrink-0">{fmt!.icon}</span>
                <span className="break-words">{fmt!.text}</span>
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
}