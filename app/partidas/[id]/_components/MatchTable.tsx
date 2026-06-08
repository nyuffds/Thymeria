"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  redrawAction, skipRedrawAction, playCardAction,
  passRoundAction, activateLeaderAction, abandonMatchAction,
} from "@/lib/match-actions";
import { RARITIES, ROWS } from "@/lib/constants";

type Side = "A" | "B";
type Row = "MELEE" | "RANGED" | "SIEGE";

interface PlayerInfo {
  username: string;
  roundsWon: number;
  hasPassed: boolean;
  leaderUsed: boolean;
  redrawsLeft: number;
  deckCardCount: number;
  handCount: number;
  deck: {
    name: string;
    faction: { name: string; color: string };
    leader: {
      cardId: string;
      name: string;
      imageUrl: string | null;
      leaderMode: string | null;
      ability: { name: string; description: string; engineKey: string | null } | null;
    } | null;
  };
}

interface HandCard {
  handId: string;
  cardId: string;
  name: string;
  power: number;
  rows: string;
  rarity: string;
  cardType: string;
  imageUrl: string | null;
  faction: { name: string; color: string };
  ability: { name: string; description: string; engineKey: string | null; engineValue: number | null } | null;
}

interface BoardCard {
  boardId: string;
  cardId: string;
  side: Side;
  row: Row;
  basePower: number;
  power: number;
  shielded: boolean;
  isToken: boolean;
  name: string;
  rarity: string;
  cardType: string;
  imageUrl: string | null;
  faction: { name: string; color: string };
  ability: { name: string; description: string } | null;
}

interface WeatherInfo {
  weatherKey: string;
  affectedRow: Row;
  cardName: string;
}

interface Props {
  matchId: string;
  status: string;
  round: number;
  currentTurnSide: Side | null;
  winnerSide: Side | "DRAW" | null;
  players: Record<Side, PlayerInfo>;
  hands: Record<Side, HandCard[]>;
  board: BoardCard[];
  weather: WeatherInfo[];
}

const ROW_LABEL: Record<Row, string> = {
  MELEE: "Corpo-a-corpo", RANGED: "Distância", SIEGE: "Cerco",
};
const ROW_ICON: Record<Row, string> = {
  MELEE: "⚔", RANGED: "🏹", SIEGE: "🏰",
};

const NEEDS_TARGET = new Set(["BOOST", "DAMAGE", "HEAL"]);
const WEATHER_NEEDS_ROW = new Set(["WEATHER_RAIN"]);

export function MatchTable(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [redrawSelection, setRedrawSelection] = useState<Set<string>>(new Set());
  const [selectedHandCard, setSelectedHandCard] = useState<HandCard | null>(null);
  const [chosenRow, setChosenRow] = useState<Row | null>(null);
  const [targetMode, setTargetMode] = useState<"NONE" | "ALLY" | "ENEMY">("NONE");
  const [activatingLeader, setActivatingLeader] = useState<Side | null>(null);
  const [leaderTargetMode, setLeaderTargetMode] = useState<"NONE" | "ALLY" | "ENEMY">("NONE");

  const turnSide = props.currentTurnSide;

  function guard(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try { await fn(); router.refresh(); }
      catch (err) { setError(err instanceof Error ? err.message : "Erro."); }
    });
  }

  function toggleRedraw(handId: string) {
    const player = props.players[turnSide!];
    setRedrawSelection((prev) => {
      const next = new Set(prev);
      if (next.has(handId)) next.delete(handId);
      else if (next.size < player.redrawsLeft) next.add(handId);
      return next;
    });
  }
  function confirmRedraw() {
    const ids = Array.from(redrawSelection);
    guard(async () => {
      await redrawAction(props.matchId, turnSide!, ids);
      setRedrawSelection(new Set());
    });
  }
  function skipRedraw() {
    guard(async () => {
      await skipRedrawAction(props.matchId, turnSide!);
      setRedrawSelection(new Set());
    });
  }

  function handleSelectHandCard(card: HandCard) {
    if (props.status !== "PLAYING" || props.players[turnSide!].hasPassed) return;
    setSelectedHandCard(card);
    setChosenRow(null);
    setTargetMode("NONE");
  }

  function handleChooseRow(row: Row) {
    if (!selectedHandCard) return;
    setChosenRow(row);
    const ek = selectedHandCard.ability?.engineKey;
    if (ek && NEEDS_TARGET.has(ek)) {
      setTargetMode(ek === "BOOST" || ek === "HEAL" ? "ALLY" : "ENEMY");
    } else {
      executePlay(row, undefined);
    }
  }

  function handleTargetClick(target: BoardCard) {
    if (!selectedHandCard || !chosenRow) return;
    const ek = selectedHandCard.ability?.engineKey;
    if (ek === "BOOST" || ek === "HEAL") {
      if (target.side !== turnSide) {
        setError("Esta habilidade requer carta aliada.");
        return;
      }
    } else if (ek === "DAMAGE") {
      if (target.side === turnSide) {
        setError("Esta habilidade requer carta inimiga.");
        return;
      }
    }
    executePlay(chosenRow, target.boardId);
  }

  function executePlay(row: Row, targetBoardCardId?: string) {
    if (!selectedHandCard) return;
    const handCardId = selectedHandCard.handId;
    guard(async () => {
      await playCardAction({
        matchId: props.matchId, side: turnSide!, handCardId,
        targetRow: row, targetBoardCardId,
      });
      setSelectedHandCard(null);
      setChosenRow(null);
      setTargetMode("NONE");
    });
  }

  function cancelPlay() {
    setSelectedHandCard(null);
    setChosenRow(null);
    setTargetMode("NONE");
  }

  function handlePass() {
    if (!confirm("Passar a vez? Você não joga mais nesta ronda.")) return;
    guard(async () => { await passRoundAction(props.matchId, turnSide!); });
  }

  function handleActivateLeader() {
    const leader = props.players[turnSide!].deck.leader;
    if (!leader || leader.leaderMode !== "ACTIVE") return;
    const ek = leader.ability?.engineKey ?? null;
    if (ek && NEEDS_TARGET.has(ek)) {
      setActivatingLeader(turnSide);
      setLeaderTargetMode(ek === "BOOST" || ek === "HEAL" ? "ALLY" : "ENEMY");
    } else {
      guard(async () => {
        await activateLeaderAction({ matchId: props.matchId, side: turnSide! });
      });
    }
  }
  function handleLeaderTargetClick(target: BoardCard) {
    if (!activatingLeader) return;
    const side = activatingLeader;
    guard(async () => {
      await activateLeaderAction({
        matchId: props.matchId, side, targetBoardCardId: target.boardId,
      });
      setActivatingLeader(null);
      setLeaderTargetMode("NONE");
    });
  }
  function cancelLeaderActivation() {
    setActivatingLeader(null);
    setLeaderTargetMode("NONE");
  }

  function handleAbandon() {
    if (!confirm("Abandonar a partida? Será encerrada em empate.")) return;
    guard(async () => { await abandonMatchAction(props.matchId); });
  }

  function rowsAllowed(card: HandCard | null): Row[] {
    if (!card) return [];
    return card.rows.split(",").filter(Boolean) as Row[];
  }
  function cardsOnRow(side: Side, row: Row): BoardCard[] {
    return props.board.filter((b) => b.side === side && b.row === row);
  }
  function rowTotal(side: Side, row: Row): number {
    return cardsOnRow(side, row).reduce((s, c) => s + c.power, 0);
  }
  function sideTotal(side: Side): number {
    return props.board.filter((b) => b.side === side).reduce((s, c) => s + c.power, 0);
  }
  function weatherOnRow(row: Row): WeatherInfo | undefined {
    return props.weather.find((w) => w.affectedRow === row);
  }

  if (props.status === "FINISHED") {
    return renderFinished();
  }

  const turnPlayer = turnSide ? props.players[turnSide] : null;

  return (
    <div className="space-y-3">
      {/* Banner gigante de turno */}
      {turnSide && turnPlayer && (
        <div
          className="rounded-xl border-2 p-4 text-center"
          style={{
            borderColor: turnPlayer.deck.faction.color,
            background: "linear-gradient(135deg, " + turnPlayer.deck.faction.color + "22, transparent)",
          }}
        >
          <p className="text-xs uppercase tracking-widest text-zinc-400">
            {props.status === "REDRAW" ? "Redraw" : "Vez de jogar"}
          </p>
          <p className="text-2xl font-heading font-bold mt-1" style={{ color: turnPlayer.deck.faction.color }}>
            {turnPlayer.username}
            <span className="text-zinc-500 text-base ml-2">(lado {turnSide})</span>
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {turnPlayer.deck.faction.name} · {turnPlayer.deck.name}
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
          {error}
        </p>
      )}

      {/* Lado B (sempre em cima) */}
      {renderPlayerHeader("B")}
      {(["SIEGE", "RANGED", "MELEE"] as Row[]).map((r) => renderRow("B", r))}

      <div className="h-2 bg-amber-700/30 rounded" />

      {/* Lado A (sempre em baixo) */}
      {(["MELEE", "RANGED", "SIEGE"] as Row[]).map((r) => renderRow("A", r))}
      {renderPlayerHeader("A")}

      <div className="mt-4">{renderControl()}</div>

      {selectedHandCard && !chosenRow && renderRowPicker()}

      {targetMode !== "NONE" && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-amber-900/90 text-amber-100 text-sm px-4 py-2 rounded-lg shadow-xl z-40 border border-amber-600">
          Clique numa carta {targetMode === "ALLY" ? "aliada" : "inimiga"} no tabuleiro
          <button onClick={cancelPlay} className="ml-3 underline text-amber-200">cancelar</button>
        </div>
      )}

      {activatingLeader && leaderTargetMode !== "NONE" && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-purple-900/90 text-purple-100 text-sm px-4 py-2 rounded-lg shadow-xl z-40 border border-purple-600">
          Líder: clique numa carta {leaderTargetMode === "ALLY" ? "aliada" : "inimiga"}
          <button onClick={cancelLeaderActivation} className="ml-3 underline text-purple-200">cancelar</button>
        </div>
      )}
    </div>
  );

  function renderPlayerHeader(side: Side) {
    const p = props.players[side];
    const isTurn = turnSide === side && (props.status === "PLAYING" || props.status === "REDRAW");
    return (
      <div
        className={"flex items-center justify-between p-3 rounded-lg border-2 transition " +
          (isTurn
            ? "border-amber-500 bg-amber-950/40 shadow-lg shadow-amber-900/30"
            : "border-zinc-800 bg-zinc-900/40 opacity-60")}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-2 bg-zinc-800 flex-shrink-0"
            style={{
              borderColor: p.deck.faction.color,
              ...(p.deck.leader?.imageUrl ? {
                backgroundImage: "url(" + p.deck.leader.imageUrl + ")",
                backgroundSize: "cover",
                backgroundPosition: "center",
              } : {}),
            }}
          />
          <div>
            <p className="font-semibold text-zinc-100">
              {p.username} <span className="text-xs text-zinc-500">({side})</span>
              {p.hasPassed && <span className="ml-2 text-xs text-amber-400">— passou</span>}
            </p>
            <p className="text-xs" style={{ color: p.deck.faction.color }}>
              {p.deck.faction.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="text-zinc-400 text-xs">
            Mão <span className="text-zinc-100 font-mono">{p.handCount}</span> · Deck <span className="text-zinc-100 font-mono">{p.deckCardCount}</span>
          </div>
          <div className="flex gap-1">
            {[0, 1].map((i) => (
              <span key={i} className={"w-3 h-3 rounded-full " +
                (i < p.roundsWon ? "bg-amber-400" : "bg-zinc-700")} />
            ))}
          </div>
          <div className="text-2xl font-mono font-bold text-amber-300 w-12 text-right">
            {sideTotal(side)}
          </div>
        </div>
      </div>
    );
  }

  function renderRow(side: Side, row: Row) {
    const cards = cardsOnRow(side, row);
    const total = rowTotal(side, row);
    const w = weatherOnRow(row);

    // Só destaca fileira pra jogar se:
    //  - tem carta selecionada
    //  - ainda não escolheu fileira
    //  - É O LADO DE QUEM ESTÁ JOGANDO (= turnSide)
    //  - a carta permite essa fileira
    //  - não é carta de clima
    const isAvailableToPlay =
      selectedHandCard !== null &&
      !chosenRow &&
      side === turnSide &&
      rowsAllowed(selectedHandCard).includes(row) &&
      selectedHandCard.cardType !== "WEATHER";

    const isTurnSide = side === turnSide;

    return (
      <div
        key={side + row}
        className={"flex items-center gap-2 p-2 rounded border transition " +
          (w ? "border-blue-700/50 bg-blue-950/20" :
            isTurnSide ? "border-zinc-800 bg-zinc-900/40" : "border-zinc-800/50 bg-zinc-900/20 opacity-70") +
          (isAvailableToPlay ? " ring-2 ring-amber-500 cursor-pointer hover:bg-amber-950/20" : "")}
        onClick={isAvailableToPlay ? () => handleChooseRow(row) : undefined}
      >
        <div className="w-20 flex-shrink-0 text-xs uppercase text-zinc-500 flex items-center gap-1">
          <span className="text-lg">{ROW_ICON[row]}</span>
          <span className="hidden sm:inline">{ROW_LABEL[row]}</span>
        </div>

        <div className="flex-1 flex flex-wrap gap-1 min-h-[60px] items-center">
          {cards.length === 0 ? (
            <span className="text-xs text-zinc-700 italic">vazia</span>
          ) : (
            cards.map((c) => renderBoardCard(c))
          )}
          {w && (
            <span className="text-xs text-blue-300 italic ml-auto">
              ⛈ {w.cardName}
            </span>
          )}
        </div>

        <div className="w-12 text-right font-mono font-bold text-amber-300 text-lg">
          {total}
        </div>
      </div>
    );
  }

  function renderBoardCard(c: BoardCard) {
    const rarity = RARITIES.find((r) => r.key === c.rarity);
    const isTargetable =
      (targetMode === "ALLY" && c.side === turnSide) ||
      (targetMode === "ENEMY" && c.side !== turnSide) ||
      (leaderTargetMode === "ALLY" && c.side === activatingLeader) ||
      (leaderTargetMode === "ENEMY" && c.side !== activatingLeader);

    return (
      <button
        key={c.boardId}
        onClick={isTargetable
          ? (activatingLeader ? () => handleLeaderTargetClick(c) : () => handleTargetClick(c))
          : undefined}
        disabled={!isTargetable}
        className={"relative w-14 h-16 rounded border-2 bg-zinc-800 flex flex-col items-center justify-between p-0.5 text-[10px] " +
          (isTargetable ? "ring-2 ring-amber-400 cursor-pointer hover:scale-105 transition" : "cursor-default")}
        style={{ borderColor: rarity?.color ?? "#aaa" }}
        title={c.name + (c.ability ? " — " + c.ability.name : "")}
      >
        <span className="font-mono font-bold text-amber-300 text-sm">{c.power}</span>
        <span className="truncate w-full text-zinc-300 text-center leading-tight">
          {c.name.slice(0, 8)}
        </span>
        <div className="flex gap-0.5">
          {c.shielded && <span className="text-blue-400">◆</span>}
          {c.isToken && <span className="text-zinc-500">•</span>}
        </div>
      </button>
    );
  }

  function renderControl() {
    if (!turnSide) return null;
    const p = props.players[turnSide];

    if (props.status === "REDRAW") {
      return renderRedrawPanel(turnSide);
    }

    if (p.hasPassed) {
      return (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 text-center text-zinc-400">
          Você passou. Aguarde o oponente.
        </div>
      );
    }

    return renderPlayPanel(turnSide);
  }

  function renderRedrawPanel(side: Side) {
    const p = props.players[side];
    const hand = props.hands[side];

    return (
      <div className="bg-zinc-900/60 border-2 border-amber-700/40 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-amber-200">
            Mão de {p.username}
          </h2>
          <p className="text-xs text-zinc-400">
            Selecione até {p.redrawsLeft} carta(s) pra trocar.
            <span className="text-amber-300 font-mono ml-2">
              {redrawSelection.size}/{p.redrawsLeft}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-3">
          {hand.map((c) => {
            const selected = redrawSelection.has(c.handId);
            return (
              <button
                key={c.handId}
                onClick={() => toggleRedraw(c.handId)}
                disabled={isPending}
                className={"relative aspect-[2/3] rounded border-2 bg-zinc-800 flex flex-col items-center justify-between p-1 text-[10px] " +
                  (selected ? "ring-2 ring-amber-500 opacity-70" : "hover:border-zinc-500")}
                style={{ borderColor: selected ? "#f59e0b" : c.faction.color + "88" }}
              >
                <span className="font-mono font-bold text-amber-300">{c.power}</span>
                <span className="truncate w-full text-zinc-200 text-center leading-tight">
                  {c.name.slice(0, 10)}
                </span>
                <span className="text-[8px] text-zinc-500 uppercase">{c.cardType.slice(0, 3)}</span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={skipRedraw}
            disabled={isPending}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-sm transition"
          >
            Pular (não trocar)
          </button>
          <button
            onClick={confirmRedraw}
            disabled={isPending || redrawSelection.size === 0}
            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-zinc-950 font-semibold px-4 py-2 rounded text-sm transition"
          >
            Trocar {redrawSelection.size}
          </button>
        </div>
      </div>
    );
  }

  function renderPlayPanel(side: Side) {
    const p = props.players[side];
    const hand = props.hands[side];
    const leader = p.deck.leader;
    const canActivateLeader = leader && leader.leaderMode === "ACTIVE" && !p.leaderUsed;

    return (
      <div className="bg-zinc-900/60 border-2 border-amber-700/40 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-amber-200">
            Mão de {p.username}
          </h2>
          <div className="flex gap-2">
            {canActivateLeader && (
              <button
                onClick={handleActivateLeader}
                disabled={isPending || !!selectedHandCard}
                className="bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-purple-100 px-3 py-1.5 rounded text-sm transition"
                title={leader.ability?.description ?? "Ativar habilidade do líder"}
              >
                ✦ Líder
              </button>
            )}
            <button
              onClick={handlePass}
              disabled={isPending}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded text-sm transition"
            >
              Passar
            </button>
            <button
              onClick={handleAbandon}
              disabled={isPending}
              className="text-red-400 hover:text-red-300 px-3 py-1.5 rounded text-xs transition"
            >
              Abandonar
            </button>
          </div>
        </div>

        {selectedHandCard && (
          <p className="text-xs text-amber-300 mb-2">
            Carta selecionada: <span className="font-bold">{selectedHandCard.name}</span>.
            {selectedHandCard.cardType === "WEATHER"
              ? " Clima — escolha onde aplicar."
              : " Clique numa fileira destacada do SEU lado (em " + (turnSide === "A" ? "baixo" : "cima") + ")."}
            <button onClick={cancelPlay} className="ml-3 underline text-amber-200">cancelar</button>
          </p>
        )}

        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {hand.length === 0 ? (
            <p className="col-span-full text-center text-zinc-500 text-sm italic py-4">
              Mão vazia. Só resta passar.
            </p>
          ) : (
            hand.map((c) => {
              const isSelected = selectedHandCard?.handId === c.handId;
              return (
                <button
                  key={c.handId}
                  onClick={() => handleSelectHandCard(c)}
                  disabled={isPending}
                  className={"relative aspect-[2/3] rounded border-2 bg-zinc-800 flex flex-col items-center justify-between p-1 text-[10px] transition " +
                    (isSelected ? "ring-2 ring-amber-500 scale-105" : "hover:border-zinc-500")}
                  style={{ borderColor: c.faction.color + "88" }}
                  title={c.name + (c.ability ? " — " + c.ability.name + ": " + c.ability.description : "")}
                >
                  <span className="font-mono font-bold text-amber-300">{c.power}</span>
                  <span className="truncate w-full text-zinc-200 text-center leading-tight">
                    {c.name.slice(0, 10)}
                  </span>
                  <span className="text-[8px] text-zinc-500 uppercase">{c.cardType.slice(0, 3)}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }

  function renderRowPicker() {
    if (!selectedHandCard) return null;
    const ek = selectedHandCard.ability?.engineKey;
    const isWeather = selectedHandCard.cardType === "WEATHER";
    const needsRow = isWeather && (!ek || WEATHER_NEEDS_ROW.has(ek));
    if (!needsRow) return null;

    return (
      <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-amber-700 rounded-xl p-5 max-w-sm w-full">
          <h3 className="font-heading text-amber-200 mb-3">Escolha a fileira do clima</h3>
          <div className="space-y-2">
            {ROWS.map((r) => (
              <button
                key={r.key}
                onClick={() => handleChooseRow(r.key as Row)}
                disabled={isPending}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 p-3 rounded text-sm transition flex items-center gap-2"
              >
                <span className="text-lg">{ROW_ICON[r.key as Row]}</span> {r.label}
              </button>
            ))}
          </div>
          <button onClick={cancelPlay} className="mt-3 w-full text-zinc-500 hover:text-zinc-300 text-xs">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  function renderFinished() {
    const winner = props.winnerSide;
    let title = "";
    let subtitle = "";
    if (winner === "DRAW") {
      title = "Empate!";
      subtitle = "Ambos ganharam o mesmo número de rondas.";
    } else if (winner) {
      const p = props.players[winner];
      title = p.username + " venceu!";
      subtitle = "Lado " + winner + " · " + p.deck.faction.name;
    }
    return (
      <div className="bg-zinc-900/80 border-2 border-amber-700/50 rounded-2xl p-12 text-center max-w-xl mx-auto mt-12">
        <p className="text-xs uppercase text-amber-400 tracking-widest mb-2">Fim de partida</p>
        <h1 className="font-heading text-5xl font-bold text-amber-200 mb-2">{title}</h1>
        <p className="text-zinc-400 font-lore italic mb-6">{subtitle}</p>
        <div className="flex justify-center gap-6 text-sm mb-8">
          {(["A", "B"] as Side[]).map((s) => {
            const p = props.players[s];
            return (
              <div key={s}>
                <p className="text-zinc-400">{p.username}</p>
                <p className="text-2xl font-mono font-bold text-amber-300">{p.roundsWon} ronda(s)</p>
              </div>
            );
          })}
        </div>
        <a href="/partidas" className="inline-block bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-6 py-2 rounded transition">
          Voltar
        </a>
      </div>
    );
  }
}