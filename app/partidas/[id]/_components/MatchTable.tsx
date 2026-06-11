"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  redrawAction, skipRedrawAction, playCardAction,
  passRoundAction, activateLeaderAction, abandonMatchAction, peekDeckTopAction,
  offerDrawAction, respondDrawOfferAction,
  pauseMatchAction, resumeMatchAction,
} from "@/lib/match-actions";
import { RARITIES, ROWS } from "@/lib/constants";
import { MatchEventLog } from "./MatchEventLog";
import { CardTooltip } from "./CardTooltip";
import { DeckPiles } from "./DeckPiles";
import { AnimatedNumber } from "./AnimatedNumber";

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
  discardCount: number;
  deckRealCount: number;
  deck: {
    name: string;
    faction: { name: string; color: string };
    leader: {
      cardId: string;
      name: string;
      imageUrl: string | null;
  frameUrl: string | null;
      leaderMode: string | null;
      ability: { name: string; description: string; engineKey: string | null; targetCount?: number | null } | null;
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
  isElite: boolean;
  imageUrl: string | null;
  frameUrl: string | null;
  faction: { name: string; color: string };
  ability: { name: string; description: string; engineKey: string | null; engineValue: number | null; targetCount?: number | null } | null;
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
  isElite: boolean;
  imageUrl: string | null;
  frameUrl: string | null;
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
  mode: string;                          // HOTSEAT | ONLINE
  viewerSide: "A" | "B" | null;          // em ONLINE, qual lado o usuário logado está
  drawOfferedBy: "A" | "B" | null;
  pausedBy: "A" | "B" | null;
  currentRoundEvents: { id: string; type: string; side: "A" | "B" | null; payload: string; createdAt: string }[];
}

const ROW_LABEL: Record<Row, string> = {
  MELEE: "Corpo-a-corpo", RANGED: "Distância", SIEGE: "Cerco",
};
const ROW_ICON: Record<Row, string> = {
  MELEE: "⚔", RANGED: "🏹", SIEGE: "🏰",
};

const NEEDS_TARGET = new Set(["BOOST", "DAMAGE", "HEAL", "DAMAGE_IF", "DESTROY_AND_DRAW", "EVOLVE_FACTION"]);
const NEEDS_ROW_TARGET = new Set(["BOOST_ROW", "MULTIPLY_ROW", "DESTROY_ROW", "IMMUNE_ROW"]);
const WEATHER_NEEDS_ROW = new Set(["WEATHER_RAIN"]);

export function MatchTable(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [redrawSelection, setRedrawSelection] = useState<Set<string>>(new Set());
  const [selectedHandCard, setSelectedHandCard] = useState<HandCard | null>(null);
  const [chosenRow, setChosenRow] = useState<Row | null>(null);
  const [targetMode, setTargetMode] = useState<"NONE" | "ALLY" | "ENEMY" | "ROW_ALLY" | "ROW_ENEMY">("NONE");
  const [pendingEliteTarget, setPendingEliteTarget] = useState<BoardCard | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState<{ max: number; source: "BOARD" | "HAND" } | null>(null);
  const [multiSelectIds, setMultiSelectIds] = useState<string[]>([]);

  // Profecia: cartas reveladas do topo do deck + roteamento escolhido pelo jogador
  type ProphecyCard = { handId: string; name: string; power: number; cardType: string; imageUrl: string | null };
  const [prophecyCards, setProphecyCards] = useState<ProphecyCard[] | null>(null);
  const [prophecyRouting, setProphecyRouting] = useState<Record<string, "HAND" | "TOP" | "BOTTOM">>({});
  const [activatingLeader, setActivatingLeader] = useState<Side | null>(null);
  const [leaderTargetMode, setLeaderTargetMode] = useState<"NONE" | "ALLY" | "ENEMY" | "ROW_ALLY" | "ROW_ENEMY">("NONE");

  const turnSide = props.currentTurnSide;

  // Em ONLINE: sempre mostra a mão do viewer (mesmo quando não é seu turno).
  // Em HOTSEAT: mostra a mão de quem é o turno.
  const isOnline = props.mode === "ONLINE";
  const displaySide: Side | null = isOnline ? props.viewerSide : turnSide;
  const canAct = isOnline ? (turnSide === props.viewerSide) : true;

// SSE: escuta mudanças do servidor em tempo real
  useEffect(() => {
    console.log("[MatchTable SSE] useEffect rodou. isOnline=", isOnline, "status=", props.status);
    if (!isOnline) {
      console.log("[MatchTable SSE] NÃO conectando (isOnline=false)");
      return;
    }
    if (props.status === "FINISHED") {
      console.log("[MatchTable SSE] NÃO conectando (FINISHED)");
      return;
    }

    console.log("[MatchTable SSE] conectando no stream...");
    const eventSource = new EventSource("/api/partidas/" + props.matchId + "/stream");

    eventSource.addEventListener("connected", (e) => {
      console.log("[MatchTable SSE] CONNECTED:", e.data);
    });

    eventSource.addEventListener("change", (e) => {
      console.log("[MatchTable SSE] CHANGE recebido, chamando router.refresh()", e.data);
      router.refresh();
    });

    eventSource.addEventListener("error", (e) => {
      console.log("[MatchTable SSE] ERROR:", e);
    });

    return () => {
      console.log("[MatchTable SSE] desconectando...");
      eventSource.close();
    };
  }, [isOnline, props.status, props.matchId, router]);

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
    if (props.status !== "PLAYING") return;
    if (!canAct) return;
    if (!turnSide || props.players[turnSide].hasPassed) return;
    setSelectedHandCard(card);
    setChosenRow(null);
    setTargetMode("NONE");
  }

  function handleChooseRow(row: Row) {
    if (!selectedHandCard) return;
    setChosenRow(row);
    const ek = selectedHandCard.ability?.engineKey;
    if (ek === "BOOST_MANY") {
      const max = selectedHandCard.ability?.targetCount ?? 3;
      setMultiSelectMode({ max, source: "BOARD" });
      setMultiSelectIds([]);
    } else if (ek === "SHUFFLE_AND_DRAW") {
      const max = selectedHandCard.ability?.engineValue ?? 3;
      setMultiSelectMode({ max, source: "HAND" });
      setMultiSelectIds([]);
    } else if (ek === "PROPHECY") {
      // Abre modal especial: revela X cartas do topo do deck
      const peekCount = selectedHandCard.ability?.engineValue ?? 3;
      peekDeckTopAction(props.matchId, turnSide!, peekCount).then((cards) => {
        setProphecyCards(cards);
        const initialRouting: Record<string, "HAND" | "TOP" | "BOTTOM"> = {};
        for (const c of cards) initialRouting[c.handId] = "TOP";
        setProphecyRouting(initialRouting);
      });
    } else if (ek && NEEDS_TARGET.has(ek)) {
      setTargetMode((ek === "BOOST" || ek === "HEAL" || ek === "EVOLVE_FACTION") ? "ALLY" : "ENEMY");
    } else if (ek && NEEDS_ROW_TARGET.has(ek)) {
      setTargetMode(ek === "DESTROY_ROW" ? "ROW_ENEMY" : "ROW_ALLY");
    } else {
      executePlay(row, undefined);
    }
  }

  function handleTargetClick(target: BoardCard) {
    if (!selectedHandCard || !chosenRow) return;
    const ek = selectedHandCard.ability?.engineKey;

    // Habilidades de fileira: pega o row do alvo clicado e envia como effectRow
    if (ek && NEEDS_ROW_TARGET.has(ek)) {
      // Valida lado da fileira
      const isEnemyTarget = ek === "DESTROY_ROW";
      if (isEnemyTarget && target.side === turnSide) {
        setError("Esta habilidade requer fileira inimiga.");
        return;
      }
      if (!isEnemyTarget && target.side !== turnSide) {
        setError("Esta habilidade requer fileira aliada.");
        return;
      }
      executePlay(chosenRow, undefined, target.row);
      return;
    }

    if (ek === "BOOST" || ek === "HEAL" || ek === "EVOLVE_FACTION") {
      if (target.side !== turnSide) {
        setError("Esta habilidade requer carta aliada.");
        return;
      }
    } else if (ek === "DAMAGE" || ek === "DAMAGE_IF" || ek === "DESTROY_AND_DRAW") {
      if (target.side === turnSide) {
        setError("Esta habilidade requer carta inimiga.");
        return;
      }
    }
    // Se alvo for Elite, pede confirmacao
    if (target.isElite) {
      setPendingEliteTarget(target);
      return;
    }
    executePlay(chosenRow, target.boardId);
  }

  function confirmEliteTarget() {
    if (!pendingEliteTarget || !chosenRow) return;
    executePlay(chosenRow, pendingEliteTarget.boardId);
    setPendingEliteTarget(null);
  }

  function confirmMultiSelect() {
    if (!chosenRow || multiSelectIds.length === 0) return;
    executePlay(chosenRow, undefined, undefined, multiSelectIds);
    setMultiSelectMode(null);
    setMultiSelectIds([]);
  }
  function cancelMultiSelect() {
    setMultiSelectMode(null);
    setMultiSelectIds([]);
    setSelectedHandCard(null);
    setChosenRow(null);
  }
  function toggleMultiSelectId(id: string) {
    setMultiSelectIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (multiSelectMode && prev.length >= multiSelectMode.max) return prev;
      return [...prev, id];
    });
  }

  function setProphecyDest(handId: string, dest: "HAND" | "TOP" | "BOTTOM") {
    setProphecyRouting((prev) => ({ ...prev, [handId]: dest }));
  }
  function confirmProphecy() {
    if (!chosenRow || !prophecyCards) return;
    const routing = prophecyCards.map((c) => ({ handId: c.handId, destination: prophecyRouting[c.handId] ?? "TOP" }));
    executePlay(chosenRow, undefined, undefined, undefined, routing);
    setProphecyCards(null);
    setProphecyRouting({});
  }
  function cancelProphecy() {
    setProphecyCards(null);
    setProphecyRouting({});
    setSelectedHandCard(null);
    setChosenRow(null);
  }

  function cancelEliteTarget() {
    setPendingEliteTarget(null);
  }

  function executePlay(row: Row, targetBoardCardId?: string, effectRow?: Row, multiTargetIds?: string[], prophecyRouting?: Array<{ handId: string; destination: "HAND" | "TOP" | "BOTTOM" }>) {
    if (!selectedHandCard) return;
    const handCardId = selectedHandCard.handId;
    guard(async () => {
      await playCardAction({
        matchId: props.matchId, side: turnSide!, handCardId,
        targetRow: row, targetBoardCardId, effectRow, multiTargetIds, prophecyRouting,
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
    if (!turnSide) return;
    if (isPending) return; // bloqueia clique duplo
    if (!confirm("Passar a vez? Você não joga mais nesta ronda.")) return;
    guard(async () => { await passRoundAction(props.matchId, turnSide); });
  }

  function handleActivateLeader() {
    const leader = props.players[turnSide!].deck.leader;
    if (!leader || leader.leaderMode !== "ACTIVE") return;
    const ek = leader.ability?.engineKey ?? null;
    if (ek && NEEDS_TARGET.has(ek)) {
      setActivatingLeader(turnSide);
      setLeaderTargetMode((ek === "BOOST" || ek === "HEAL" || ek === "EVOLVE_FACTION") ? "ALLY" : "ENEMY");
    } else if (ek && NEEDS_ROW_TARGET.has(ek)) {
      setActivatingLeader(turnSide);
      setLeaderTargetMode(ek === "DESTROY_ROW" ? "ROW_ENEMY" : "ROW_ALLY");
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
    if (isPending) return;
    if (!confirm("Abandonar a partida? Você será considerado derrotado.")) return;
    guard(async () => { await abandonMatchAction(props.matchId); });
  }

  function handleOfferDraw() {
    if (isPending) return;
    if (!confirm("Oferecer empate ao oponente? Ele precisará aceitar.")) return;
    guard(async () => { await offerDrawAction(props.matchId); });
  }

  function handleRespondDraw(accept: boolean) {
    guard(async () => { await respondDrawOfferAction(props.matchId, accept); });
  }

  function handlePause() {
    if (isPending) return;
    if (!confirm("Pausar a partida? O timeout fica congelado até alguém retomar.")) return;
    guard(async () => { await pauseMatchAction(props.matchId); });
  }

  function handleResume() {
    guard(async () => { await resumeMatchAction(props.matchId); });
  }

  // Quem é "eu" (pra saber se posso retomar a pausa)
  const mySide: "A" | "B" | null = isOnline ? props.viewerSide : turnSide;
  const canResumePause = props.pausedBy !== null && mySide === props.pausedBy;

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
    <div className="flex gap-4">
      <div
        className="flex-1 space-y-3 min-w-0 rounded-2xl border-4 shadow-2xl p-4 relative overflow-hidden"
        style={{
          borderColor: "#3d2817",
          backgroundImage:
            "linear-gradient(rgba(20, 12, 4, 0.85), rgba(20, 12, 4, 0.85)), " +
            "url('https://images.unsplash.com/photo-1604147706283-d7119b5b822c?w=1600&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          boxShadow: "inset 0 0 60px rgba(0, 0, 0, 0.7), 0 10px 40px rgba(0, 0, 0, 0.6)",
        }}
      >
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
            {props.status === "REDRAW"
              ? (isOnline && turnSide !== props.viewerSide ? "Redraw do oponente" : "Redraw")
              : (isOnline && turnSide !== props.viewerSide ? "Vez do oponente" : "Vez de jogar")}
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

      {props.pausedBy && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-amber-700 rounded-2xl p-8 max-w-md text-center shadow-2xl">
            <p className="text-xs uppercase tracking-widest text-amber-400 mb-2">Partida pausada</p>
            <p className="font-heading text-3xl text-amber-200 mb-3">
              ⏸ Pausa
            </p>
            <p className="text-sm text-zinc-300 mb-6">
              Pausada por {props.players[props.pausedBy].username} (lado {props.pausedBy}).
              {canResumePause
                ? " Você pausou — clique abaixo pra retomar."
                : " Aguardando o jogador que pausou retomar."}
            </p>
            {canResumePause ? (
              <button
                onClick={handleResume}
                disabled={isPending}
                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-zinc-950 font-semibold px-6 py-2 rounded-lg transition"
              >
                {isPending ? "Retomando..." : "▶ Retomar partida"}
              </button>
            ) : (
              <p className="text-xs text-zinc-500 italic">
                Aproveite a pausa.
              </p>
            )}
          </div>
        </div>
      )}


      {props.drawOfferedBy && (() => {
        const offeredByMe = isOnline
          ? props.drawOfferedBy === props.viewerSide
          : props.drawOfferedBy === turnSide;
        return (
          <div className="bg-purple-950/40 border-2 border-purple-700 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-purple-200">
                {offeredByMe
                  ? "Você ofereceu empate. Aguardando resposta do oponente…"
                  : "O oponente está oferecendo empate."}
              </p>
              {!offeredByMe && (
                <p className="text-xs text-purple-300 mt-0.5">
                  Aceitar encerra a partida sem vencedor.
                </p>
              )}
            </div>
            {!offeredByMe && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleRespondDraw(true)}
                  disabled={isPending}
                  className="bg-purple-600 hover:bg-purple-500 text-purple-50 font-semibold px-3 py-1.5 rounded text-sm transition"
                >
                  Aceitar empate
                </button>
                <button
                  onClick={() => handleRespondDraw(false)}
                  disabled={isPending}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded text-sm transition"
                >
                  Recusar
                </button>
              </div>
            )}
          </div>
        );
      })()}

{/* Lado B (sempre em cima) */}
      {renderPlayerHeader("B")}
      <div className="flex gap-3 items-stretch">
        <div className="flex-1 space-y-2 min-w-0">
          {(["SIEGE", "RANGED", "MELEE"] as Row[]).map((r) => renderRow("B", r))}
        </div>
        <DeckPiles
          deckCount={props.players.B.deckRealCount}
          discardCount={props.players.B.discardCount}
          factionColor={props.players.B.deck.faction.color}
          side="B"
        />
      </div>

      <div
        className="h-4 rounded-full shadow-inner my-3 relative"
        style={{
          background: "linear-gradient(to bottom, #3d2817, #8b6019, #f3c969, #8b6019, #3d2817)",
          boxShadow: "0 0 20px rgba(212, 160, 74, 0.5), inset 0 1px 3px rgba(0, 0, 0, 0.6)",
        }}
      >
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
          <span className="text-amber-200 text-xs px-3 bg-gradient-to-r from-transparent via-zinc-950 to-transparent">
            ⚔
          </span>
        </div>
      </div>

{/* Lado A (sempre em baixo) */}
      <div className="flex gap-3 items-stretch">
        <div className="flex-1 space-y-2 min-w-0">
          {(["MELEE", "RANGED", "SIEGE"] as Row[]).map((r) => renderRow("A", r))}
        </div>
        <DeckPiles
          deckCount={props.players.A.deckRealCount}
          discardCount={props.players.A.discardCount}
          factionColor={props.players.A.deck.faction.color}
          side="A"
        />
      </div>
      {renderPlayerHeader("A")}

      <div className="mt-4">{renderControl()}</div>

      {selectedHandCard && !chosenRow && renderRowPicker()}

      {targetMode !== "NONE" && (() => {
        const isAllySide = targetMode === "ALLY" || targetMode === "ROW_ALLY";
        const isRowMode = targetMode === "ROW_ALLY" || targetMode === "ROW_ENEMY";
        const validTargets = props.board.filter((c) =>
          isRowMode
            ? (isAllySide ? c.side === turnSide : c.side !== turnSide)  // ROW: nao filtra Elite (afetam fileira inteira)
            : isAllySide
              ? (c.side === turnSide && !c.isElite)
              : (c.side !== turnSide && !c.isElite)
        );
        const allTargets = props.board.filter((c) =>
          isAllySide ? c.side === turnSide : c.side !== turnSide
        );
        const onlyElite = allTargets.length > 0 && validTargets.length === 0;
        const noTargets = allTargets.length === 0;
        return (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-amber-900/90 text-amber-100 text-sm px-4 py-2 rounded-lg shadow-xl z-40 border border-amber-600 flex items-center gap-3">
            {validTargets.length > 0 && (
              <span>{isRowMode ? `Clique em qualquer carta da fileira ${isAllySide ? "aliada" : "inimiga"} que quer afetar` : `Clique numa carta ${isAllySide ? "aliada" : "inimiga"} no tabuleiro`}</span>
            )}
            {onlyElite && (
              <span>Todas as cartas {isAllySide ? "aliadas" : "inimigas"} sao Elite (imunes).</span>
            )}
            {noTargets && (
              <span>Nenhuma carta {isAllySide ? "aliada" : "inimiga"} no campo.</span>
            )}
            {chosenRow && (
              <button
                onClick={() => { executePlay(chosenRow, undefined); }}
                disabled={isPending}
                className="bg-zinc-700 hover:bg-zinc-600 text-zinc-100 px-3 py-1 rounded text-xs transition"
                title="A carta entra em campo mas a habilidade nao tera efeito"
              >
                Jogar sem efeito
              </button>
            )}
            <button onClick={cancelPlay} className="underline text-amber-200">cancelar</button>
          </div>
        );
      })()}

      {/* Modal de confirmacao quando alvo for Elite */}
      {/* Modal da Profecia: routear cada carta revelada */}
      {prophecyCards && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-purple-500 rounded-xl p-6 max-w-3xl w-full shadow-2xl">
            <h3 className="text-xl font-bold text-purple-200 mb-2">Profecia: Veja seu futuro</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Voce ve as proximas {prophecyCards.length} cartas do seu deck. Decida o destino de cada uma.
            </p>
            <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
              {prophecyCards.map((c, idx) => (
                <div key={c.handId} className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 flex items-center gap-3">
                  <div className="text-xs text-zinc-500 font-mono w-6">{idx + 1}</div>
                  {c.imageUrl && <img src={c.imageUrl} alt={c.name} className="w-12 h-16 object-cover rounded" />}
                  <div className="flex-1">
                    <div className="font-semibold text-zinc-100">{c.name}</div>
                    <div className="text-xs text-zinc-400">{c.cardType} - Poder {c.power}</div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setProphecyDest(c.handId, "HAND")}
                      className={"px-2 py-1 text-xs rounded font-semibold transition " + (prophecyRouting[c.handId] === "HAND" ? "bg-green-600 text-zinc-950" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600")}
                    >Mao</button>
                    <button
                      onClick={() => setProphecyDest(c.handId, "TOP")}
                      className={"px-2 py-1 text-xs rounded font-semibold transition " + (prophecyRouting[c.handId] === "TOP" ? "bg-amber-600 text-zinc-950" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600")}
                    >Topo</button>
                    <button
                      onClick={() => setProphecyDest(c.handId, "BOTTOM")}
                      className={"px-2 py-1 text-xs rounded font-semibold transition " + (prophecyRouting[c.handId] === "BOTTOM" ? "bg-red-600 text-zinc-100" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600")}
                    >Fundo</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={cancelProphecy} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-lg text-sm">Cancelar</button>
              <button onClick={confirmProphecy} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-zinc-100 font-semibold rounded-lg text-sm">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de multi-select para BOOST_MANY (Nutrir) */}
      {multiSelectMode && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-amber-500 rounded-xl p-6 max-w-2xl w-full shadow-2xl">
            <h3 className="text-xl font-bold text-amber-200 mb-2">{multiSelectMode.source === "HAND" ? "Escolha cartas da mao" : "Escolha as cartas aliadas"}</h3>
            <p className="text-sm text-zinc-400 mb-4">
              {multiSelectMode.source === "HAND"
                ? `Selecione ate ${multiSelectMode.max} cartas da mao para devolver ao deck.`
                : `Selecione ate ${multiSelectMode.max} cartas aliadas para receber o efeito.`}
              {" "}({multiSelectIds.length}/{multiSelectMode.max} selecionadas)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-96 overflow-y-auto mb-4">
              {multiSelectMode.source === "HAND"
                ? props.hands[turnSide!].filter((c) => c.handId !== selectedHandCard?.handId).map((c) => {
                    const isSelected = multiSelectIds.includes(c.handId);
                    return (
                      <button
                        key={c.handId}
                        onClick={() => toggleMultiSelectId(c.handId)}
                        className={"text-left px-3 py-2 rounded-lg border-2 transition " + (isSelected ? "border-amber-500 bg-amber-900/30" : "border-zinc-700 bg-zinc-800 hover:border-zinc-600")}
                      >
                        <div className="font-semibold text-zinc-100 text-sm">{c.name}</div>
                        <div className="text-xs text-zinc-400">Poder {c.power}</div>
                      </button>
                    );
                  })
                : props.board.filter((c) => c.side === turnSide && !c.isElite).map((c) => {
                    const isSelected = multiSelectIds.includes(c.boardId);
                    return (
                      <button
                        key={c.boardId}
                        onClick={() => toggleMultiSelectId(c.boardId)}
                        className={"text-left px-3 py-2 rounded-lg border-2 transition " + (isSelected ? "border-amber-500 bg-amber-900/30" : "border-zinc-700 bg-zinc-800 hover:border-zinc-600")}
                      >
                        <div className="font-semibold text-zinc-100 text-sm">{c.name}</div>
                        <div className="text-xs text-zinc-400">{c.row} - Poder {c.power}</div>
                      </button>
                    );
                  })}
            </div>
            {((multiSelectMode.source === "HAND" && props.hands[turnSide!].filter((c) => c.handId !== selectedHandCard?.handId).length === 0)
              || (multiSelectMode.source === "BOARD" && props.board.filter((c) => c.side === turnSide && !c.isElite).length === 0)) && (
              <p className="text-sm text-amber-400 mb-4 italic">Nenhuma carta disponivel.</p>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={cancelMultiSelect} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-lg text-sm">Cancelar</button>
              <button onClick={confirmMultiSelect} disabled={multiSelectIds.length === 0} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-zinc-950 font-semibold rounded-lg text-sm">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {pendingEliteTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-amber-500 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">👑</span>
              <h3 className="font-heading font-bold text-xl text-amber-300">Carta Elite</h3>
            </div>
            <p className="text-zinc-200 text-sm mb-2">
              <span className="font-semibold text-amber-200">{pendingEliteTarget.name}</span> é uma carta Elite e é
              <span className="text-amber-300 font-semibold"> imune a todos os efeitos</span> (boost, dano, climas).
            </p>
            <p className="text-zinc-400 text-xs italic mb-5">
              Sua habilidade vai ser ativada mas não terá efeito sobre esta carta. Deseja continuar mesmo assim?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelEliteTarget}
                disabled={isPending}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-sm transition"
              >
                Escolher outro alvo
              </button>
              <button
                onClick={confirmEliteTarget}
                disabled={isPending}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold rounded text-sm transition"
              >
                Confirmar mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}

      {activatingLeader && leaderTargetMode !== "NONE" && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-purple-900/90 text-purple-100 text-sm px-4 py-2 rounded-lg shadow-xl z-40 border border-purple-600">
          Líder: clique numa carta {leaderTargetMode === "ALLY" ? "aliada" : "inimiga"}
          <button onClick={cancelLeaderActivation} className="ml-3 underline text-purple-200">cancelar</button>
        </div>
      )}
      </div>

      <div className="hidden md:block flex-shrink-0">
        <MatchEventLog
          events={props.currentRoundEvents}
          playerNames={{ A: props.players.A.username, B: props.players.B.username }}
          currentRound={props.round}
        />
      </div>
    </div>
  );

  function renderPlayerHeader(side: Side) {
    const p = props.players[side];
    const isTurn = turnSide === side && (props.status === "PLAYING" || props.status === "REDRAW");
    return (
      <div
        className="flex items-center justify-between p-3 rounded-lg border-2 transition"
        style={{
          borderColor: isTurn ? "#d4a04a" : "#3d2817",
          backgroundImage: "linear-gradient(rgba(40, 25, 10, 0.85), rgba(20, 12, 4, 0.9))",
          boxShadow: isTurn
            ? "0 0 20px rgba(212, 160, 74, 0.4), inset 0 1px 0 rgba(212, 160, 74, 0.3)"
            : "inset 0 0 8px rgba(0, 0, 0, 0.5)",
        }}
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
            <AnimatedNumber value={sideTotal(side)} />
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
      canAct &&
      selectedHandCard !== null &&
      !chosenRow &&
      side === turnSide &&
      rowsAllowed(selectedHandCard).includes(row) &&
      selectedHandCard.cardType !== "WEATHER";

    const isTurnSide = side === turnSide;

    return (
<div
        key={side + row}
        className={"flex items-center gap-3 px-3 py-2 rounded-lg border-2 transition min-h-[170px] " +
          (isAvailableToPlay ? " ring-2 ring-amber-400 cursor-pointer hover:brightness-125" : "")}
style={{
          borderColor: w
            ? "rgba(96, 165, 250, 0.5)"
            : isTurnSide
              ? "#8b6019"
              : "#3d2817",
          backgroundImage: w
            ? "linear-gradient(rgba(30, 58, 138, 0.4), rgba(15, 23, 42, 0.6))"
            : "linear-gradient(rgba(60, 35, 15, 0.7), rgba(40, 22, 8, 0.85))",
          boxShadow: isTurnSide
            ? "inset 0 1px 0 rgba(212, 160, 74, 0.3), inset 0 -1px 0 rgba(0,0,0,0.5)"
            : "inset 0 0 8px rgba(0, 0, 0, 0.5)",
        }}
        onClick={isAvailableToPlay ? () => handleChooseRow(row) : undefined}
      >
        <div className="w-20 flex-shrink-0 text-[10px] uppercase tracking-wider flex items-center gap-1.5"
             style={{ color: "#c79a4b" }}>
          <span className="text-lg" style={{ filter: "drop-shadow(0 0 4px rgba(212, 160, 74, 0.6))" }}>
            {ROW_ICON[row]}
          </span>
          <span className="hidden sm:inline font-heading">{ROW_LABEL[row]}</span>
        </div>

          <div className="flex-1 flex gap-1.5 items-center overflow-x-auto overflow-y-visible py-1 scrollbar-thin">
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

<div
          className="w-12 text-right font-mono font-bold text-xl"
          style={{
            color: "#f3c969",
            textShadow: "0 0 8px rgba(243, 201, 105, 0.5), 0 2px 4px rgba(0,0,0,0.8)",
          }}
        >
          <AnimatedNumber value={total} />
        </div>
      </div>
    );
  }

  function renderBoardCard(c: BoardCard) {
    const rarity = RARITIES.find((r) => r.key === c.rarity);
const isTargetable = canAct && (
      ((targetMode === "ALLY" || targetMode === "ROW_ALLY") && c.side === turnSide) ||
      ((targetMode === "ENEMY" || targetMode === "ROW_ENEMY") && c.side !== turnSide) ||
      ((leaderTargetMode === "ALLY" || leaderTargetMode === "ROW_ALLY") && c.side === activatingLeader) ||
      ((leaderTargetMode === "ENEMY" || leaderTargetMode === "ROW_ENEMY") && c.side !== activatingLeader)
    );

return (
      <CardTooltip
        key={c.boardId}
card={{
          name: c.name,
          power: c.power,
          basePower: c.basePower,
          rarity: c.rarity,
          cardType: c.cardType,
          imageUrl: c.imageUrl,
            frameUrl: c.frameUrl,
          faction: c.faction,
          ability: c.ability ? { name: c.ability.name, description: c.ability.description } : null,
          shielded: c.shielded,
          isToken: c.isToken,
        }}
      >
<button
          onClick={isTargetable
            ? (activatingLeader ? () => handleLeaderTargetClick(c) : () => handleTargetClick(c))
            : undefined}
          disabled={!isTargetable}
          className={"relative rounded-md transition flex-shrink-0 animate-card-enter " +
            (isTargetable ? "ring-2 ring-amber-400 cursor-pointer hover:scale-110 hover:z-20" : "cursor-default")}
          style={{
            width: "130px",
            height: "195px",
            padding: "3px",
            background: c.isElite ? "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #b45309 100%)" : ("linear-gradient(135deg, #6b4423 0%, " + (rarity?.color ?? "#8b6019") + " 50%, #3d2817 100%)"),
            boxShadow: c.isElite ? "0 0 16px rgba(251, 191, 36, 0.6), 0 4px 8px rgba(0,0,0,0.6), inset 0 1px 0 rgba(251, 191, 36, 0.8)" : "0 4px 8px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212, 160, 74, 0.4)",
          }}
        >
          {/* Container interno com imagem */}
          <div
            className="relative w-full h-full rounded overflow-hidden"
            style={{
              backgroundImage: c.frameUrl ? "url(" + c.frameUrl + ")" : (c.imageUrl ? "url(" + c.imageUrl + ")" : undefined),
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: "#27272a",
            }}
          >
            {/* Selo de poder no canto superior esquerdo */}
            <div
              className="absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-base shadow-lg border-2"
              style={{
                background: "radial-gradient(circle, #d4a04a 0%, #8b6019 100%)",
                borderColor: "#3d2817",
                color: "#1a0f06",
                textShadow: "0 1px 0 rgba(255, 215, 130, 0.6)",
              }}
            >
              {c.power}
            </div>

                                        {c.isElite && (
                <div
                  className="absolute -top-2 left-1/2 -translate-x-1/2 text-2xl"
                  style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))", zIndex: 10 }}
                  title="Elite — imune a todos os efeitos"
                >
                  👑
                </div>
              )}
              {/* Estados no canto superior direito */}
            {(c.shielded || c.isToken) && (
              <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                {c.shielded && (
                  <span className="w-5 h-5 rounded-full bg-blue-900/90 border border-blue-400 flex items-center justify-center text-blue-200 text-xs shadow">
                    ◆
                  </span>
                )}
                {c.isToken && (
                  <span className="w-5 h-5 rounded-full bg-zinc-800/90 border border-zinc-500 flex items-center justify-center text-zinc-300 text-[10px] shadow">
                    •
                  </span>
                )}
              </div>
            )}

            {/* Rodapé com nome em pergaminho */}
            <div
              className="absolute bottom-0 left-0 right-0 px-1.5 py-1 text-center"
              style={{
                background: "linear-gradient(to top, rgba(20, 12, 4, 0.98) 0%, rgba(20, 12, 4, 0.85) 60%, transparent 100%)",
              }}
            >
              <p className="text-[10px] text-amber-100 font-heading leading-tight truncate"
                 style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}>
                {c.name}
              </p>
            </div>
          </div>
        </button>
      </CardTooltip>
    );
  }

    function renderControl() {
    if (!displaySide) return null;
    const p = props.players[displaySide];

    if (props.status === "REDRAW") {
      // Em ONLINE, só seu lado vê seu próprio painel de redraw quando é sua vez
      if (isOnline && (turnSide !== displaySide)) {
        return (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 text-center text-zinc-400">
            Aguardando oponente fazer redraw…
          </div>
        );
      }
      return renderRedrawPanel(displaySide);
    }

if (p.hasPassed) {
      return (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 text-center">
          <p className="text-zinc-400 mb-3">Você passou. Aguarde o oponente.</p>
          <div className="flex justify-center gap-2">
            <button
              onClick={handlePause}
              disabled={isPending || !!props.pausedBy}
              className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 px-3 py-1.5 rounded text-xs transition"
            >
              ⏸ Pausar
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
      );
    }

    // Em ONLINE: se não é sua vez, mostra a mão mas sem permitir ação
    if (isOnline && !canAct) {
      return renderPlayPanel(displaySide, true);
    }

    return renderPlayPanel(displaySide, false);
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
              <CardTooltip
                key={c.handId}
                  card={{
                  name: c.name,
                  power: c.power,
                  rarity: c.rarity,
                  cardType: c.cardType,
                  imageUrl: c.imageUrl,
            frameUrl: c.frameUrl,
                  faction: c.faction,
                  ability: c.ability ? { name: c.ability.name, description: c.ability.description } : null,
                }}
              >
<button
                  onClick={() => toggleRedraw(c.handId)}
                  disabled={isPending}
                  className={"relative aspect-[2/3] rounded border-2 overflow-hidden w-full h-full transition " +
                    (selected ? "ring-2 ring-amber-500 opacity-60" : "hover:scale-105 hover:z-10")}
                  style={{
                    borderColor: selected ? "#f59e0b" : c.faction.color + "88",
                    backgroundImage: c.frameUrl ? "url(" + c.frameUrl + ")" : (c.imageUrl ? "url(" + c.imageUrl + ")" : undefined),
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundColor: "#27272a",
                  }}
                >
                  {/* Poder no canto superior esquerdo */}
                  <span className="absolute top-0.5 right-0.5 font-mono font-bold text-amber-300 text-xs bg-black/70 px-1 rounded">
                    {c.power}
                  </span>
                  {/* Nome em rodapé sobre gradiente */}
                  <span className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-[9px] text-zinc-100 text-center truncate bg-gradient-to-t from-black/90 to-transparent">
                    {c.name}
                  </span>
                </button>
              </CardTooltip>
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

  function renderPlayPanel(side: Side, readonly: boolean = false) {
    const p = props.players[side];
    const hand = props.hands[side];
    const leader = p.deck.leader;
    const canActivateLeader = leader && leader.leaderMode === "ACTIVE" && !p.leaderUsed && !readonly;
    
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
              onClick={handleOfferDraw}
              disabled={isPending || !!props.drawOfferedBy || readonly}
              className="bg-purple-900/50 hover:bg-purple-800/50 disabled:opacity-50 text-purple-300 px-3 py-1.5 rounded text-xs transition"
              title={props.drawOfferedBy ? "Já há oferta de empate ativa" : "Oferecer empate ao oponente"}
            >
              Oferecer empate
            </button>
           <button
              onClick={handlePause}
              disabled={isPending || !!props.pausedBy}
              className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 px-3 py-1.5 rounded text-xs transition"
              title="Pausar a partida"
            >
              ⏸ Pausar
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
                <CardTooltip
                  key={c.handId}
                  card={{
                    name: c.name,
                    power: c.power,
                    rarity: c.rarity,
                    cardType: c.cardType,
                    imageUrl: c.imageUrl,
                    frameUrl: c.frameUrl,
                    faction: c.faction,
                    ability: c.ability ? { name: c.ability.name, description: c.ability.description } : null,
                  }}
                >
<button
                    onClick={() => handleSelectHandCard(c)}
                    disabled={isPending}
                    className={"relative aspect-[2/3] rounded border-2 overflow-hidden w-full h-full transition " +
                      (isSelected ? "ring-2 ring-amber-500 scale-105 z-10" : "hover:scale-105 hover:z-10")}
                    style={{
                      borderColor: c.faction.color + "88",
                      backgroundImage: c.frameUrl ? "url(" + c.frameUrl + ")" : (c.imageUrl ? "url(" + c.imageUrl + ")" : undefined),
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundColor: "#27272a",
                    }}
                  >
                    <span className="absolute top-0.5 right-0.5 font-mono font-bold text-amber-300 text-xs bg-black/70 px-1 rounded">
                      {c.power}
                    </span>
                    <span className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-[9px] text-zinc-100 text-center truncate bg-gradient-to-t from-black/90 to-transparent">
                      {c.name}
                    </span>
                  </button>
                </CardTooltip>
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
        <a
          href={props.mode === "ONLINE" ? "/lobby" : "/partidas"}
          className="inline-block bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold px-6 py-2 rounded transition"
        >
          Voltar
        </a>
      </div>
    );
  }
}