"use client";
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { passRoundAction, abandonMatchAction, pauseMatchAction, resumeMatchAction, offerDrawAction, activateLeaderAction, redrawAction, skipRedrawAction, playCardAction, peekDeckTopAction, respondDrawOfferAction } from "@/lib/match-actions";
import { MatchEventLog } from "./MatchEventLog";
import { CardTooltip } from "@/app/components/CardTooltip";
import { CardModal } from "@/app/components/CardModal";
import type { CardPreviewData } from "@/app/components/CardPreview";

type Side = "A" | "B";
type Row = "MELEE" | "RANGED" | "SIEGE";

interface PlayerInfo {
  username: string;
  roundsWon: number;
  hasPassed: boolean;
  leaderUsed: boolean;
  redrawsLeft: number;
  deckRealCount: number;
  discardCount: number;
  handCount: number;
  deck: {
    name: string;
    faction: { name: string; color: string };
    leader: {
      cardId: string;
      name: string;
      imageUrl: string | null;
      frameUrl: string | null;
      leaderMode: string | null;
      power: number;
      rarity: string;
      cardType: string;
      ability: { name: string; description: string; engineKey: string | null; targetCount?: number | null } | null;
    } | null;
  };
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
  ability: { name: string; description: string; engineKey: string | null; engineValue: number | null; targetCount?: number | null; secondaryEngineKey?: string | null; secondaryEngineValue?: number | null; secondaryTargetCount?: number | null } | null;
}

interface MatchEvent {
  id: string;
  type: string;
  side: Side | null;
  payload: string;
  createdAt: string;
}

interface Props {
  matchId: string;
  status: string;
  round: number;
  currentTurnSide: Side | null;
  players: Record<Side, PlayerInfo>;
  board: BoardCard[];
  hands: Record<Side, HandCard[]>;
  mode: string;
  viewerSide: Side | null;
  currentRoundEvents: MatchEvent[];
  weather: WeatherInfo[];
  pausedBy: Side | null;
  drawOfferedBy: Side | null;
  winnerSide: Side | "DRAW" | null;
  lastDiscarded: Record<Side, { name: string; power: number; rarity: string; cardType: string; imageUrl: string | null; frameUrl: string | null; faction: { name: string; color: string }; ability: { name: string; description: string } | null } | null>;
  sideEffects: Record<Side, {
    immunities: Array<{ row: "MELEE" | "RANGED" | "SIEGE"; turnsLeft: number }>;
    auras: Array<{ engineKey: string; amount: number }>;
    weathers: Array<{ weatherKey: string; affectedRow: "MELEE" | "RANGED" | "SIEGE" }>;
  }>;
  discards: Record<Side, Array<{
    handId: string;
    name: string;
    power: number;
    imageUrl: string | null;
    frameUrl: string | null;
    rarity: string;
    faction: { name: string; color: string };
  }>>;
  playedSpecials: Record<Side, Array<{
    cardId: string;
    name: string;
    power: number;
    rarity: string;
    cardType: string;
    imageUrl: string | null;
    frameUrl: string | null;
    faction: { name: string; color: string };
    ability: { name: string; description: string } | null;
  }>>;
}

const NEEDS_TARGET = new Set(["BOOST", "DAMAGE", "HEAL", "DAMAGE_IF", "DESTROY_AND_DRAW", "EVOLVE_FACTION", "PERMANENCE", "RETURN_TO_HAND"]);
const NEEDS_ROW_TARGET = new Set(["BOOST_ROW", "MULTIPLY_ROW", "DESTROY_ROW", "IMMUNE_ROW", "WEATHER_RAIN"]);

export function MatchTable(props: Props) {
  const pA = props.players.A;
  const pB = props.players.B;

  const [selectedHandCard, setSelectedHandCard] = useState<HandCard | null>(null);
  const [viewingCard, setViewingCard] = useState<CardPreviewData | null>(null);

  function openBoardCard(c: BoardCard) {
    setViewingCard({
      name: c.name,
      power: c.power,
      rows: c.row,
      rarity: c.rarity,
      cardType: c.cardType,
      imageUrl: c.imageUrl,
      frameUrl: c.frameUrl,
      faction: c.faction,
      ability: c.ability ? { name: c.ability.name, description: c.ability.description } : null,
    });
  }

  function openHandCard(c: HandCard) {
    setViewingCard({
      name: c.name,
      power: c.power,
      rows: c.rows,
      rarity: c.rarity,
      cardType: c.cardType,
      imageUrl: c.imageUrl,
      frameUrl: c.frameUrl,
      faction: c.faction,
      ability: c.ability ? { name: c.ability.name, description: c.ability.description } : null,
    });
  }

  function openLastDiscarded(d: { name: string; power: number; rarity: string; cardType: string; imageUrl: string | null; frameUrl: string | null; faction: { name: string; color: string }; ability: { name: string; description: string } | null }) {
    setViewingCard({
      name: d.name,
      power: d.power,
      rows: "",
      rarity: d.rarity,
      cardType: d.cardType,
      imageUrl: d.imageUrl,
      frameUrl: d.frameUrl,
      faction: d.faction,
      ability: d.ability,
    });
  }

  function openPlayedSpecial(s: { name: string; power: number; rarity: string; cardType: string; imageUrl: string | null; frameUrl: string | null; faction: { name: string; color: string }; ability: { name: string; description: string } | null }) {
    setViewingCard({
      name: s.name,
      power: s.power,
      rows: "",
      rarity: s.rarity,
      cardType: s.cardType,
      imageUrl: s.imageUrl,
      frameUrl: s.frameUrl,
      faction: s.faction,
      ability: s.ability,
    });
  }

  function openLeader(p: PlayerInfo) {
    if (!p.deck.leader) return;
    const l = p.deck.leader;
    setViewingCard({
      name: l.name,
      power: l.power,
      rows: "",
      rarity: l.rarity,
      cardType: l.cardType,
      imageUrl: l.imageUrl,
      frameUrl: l.frameUrl,
      faction: p.deck.faction,
      ability: l.ability ? { name: l.ability.name, description: l.ability.description } : null,
    });
  }
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function guard(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try { await fn(); }
      catch (err) { setError(err instanceof Error ? err.message : "Erro."); return; }
      router.refresh();
    });
  }

  function handlePass() {
    if (!props.currentTurnSide || isPending) return;
    if (!confirm("Passar a vez? Voce nao joga mais nesta ronda.")) return;
    guard(async () => { await passRoundAction(props.matchId, props.currentTurnSide!); });
  }
  function handleAbandon() {
    if (isPending) return;
    if (!confirm("Abandonar a partida? Voce sera considerado derrotado.")) return;
    guard(async () => { await abandonMatchAction(props.matchId); });
  }
  function handlePause() {
    if (isPending) return;
    if (!confirm("Pausar a partida?")) return;
    guard(async () => { await pauseMatchAction(props.matchId); });
  }
  function handleOfferDraw() {
    if (isPending) return;
    if (!confirm("Oferecer empate ao oponente?")) return;
    guard(async () => { await offerDrawAction(props.matchId); });
  }

  function handleRespondDraw(accept: boolean) {
    guard(async () => { await respondDrawOfferAction(props.matchId, accept); });
  }

  function handleResume() {
    guard(async () => { await resumeMatchAction(props.matchId); });
  }

  // Estado de redraw
  const [redrawSelection, setRedrawSelection] = useState<Set<string>>(new Set());

  function toggleRedraw(handId: string) {
    if (!canAct || !mySide) return;
    const player = props.players[mySide];
    setRedrawSelection((prev) => {
      const next = new Set(prev);
      if (next.has(handId)) next.delete(handId);
      else if (next.size < player.redrawsLeft) next.add(handId);
      return next;
    });
  }
  function confirmRedraw() {
    if (!canAct || !mySide) return;
    const ids = Array.from(redrawSelection);
    guard(async () => {
      await redrawAction(props.matchId, mySide!, ids);
      setRedrawSelection(new Set());
    });
  }
  function skipRedraw() {
    if (!canAct || !mySide) return;
    guard(async () => {
      await skipRedrawAction(props.matchId, mySide!);
      setRedrawSelection(new Set());
    });
  }

  // Estado de ativacao do lider
  const [activatingLeader, setActivatingLeader] = useState<Side | null>(null);
  const [leaderTargetMode, setLeaderTargetMode] = useState<"NONE" | "ALLY" | "ENEMY" | "ROW_ALLY" | "ROW_ENEMY" | "ANY">("NONE");
  const [chosenRow, setChosenRow] = useState<Row | null>(null);
  const [targetMode, setTargetMode] = useState<"NONE" | "ALLY" | "ENEMY" | "ANY">("NONE");
  const [rowTargetMode, setRowTargetMode] = useState<"NONE" | "ROW_ALLY" | "ROW_ENEMY">("NONE");
  const [multiSelectMode, setMultiSelectMode] = useState<{ max: number; source: "BOARD" | "HAND" | "DISCARD" } | null>(null);
  const [multiSelectIds, setMultiSelectIds] = useState<string[]>([]);
  const [prophecyCards, setProphecyCards] = useState<{ handId: string; name: string; power: number; cardType: string; imageUrl: string | null }[] | null>(null);
  const [prophecyRouting, setProphecyRouting] = useState<Record<string, "HAND" | "TOP" | "BOTTOM" | null>>({});
  const [weatherChoosingRow, setWeatherChoosingRow] = useState(false);
  type CollectedTargets = {
    targetBoardCardId?: string;
    effectRow?: Row;
    multiTargetIds?: string[];
    prophecyRouting?: Array<{ handId: string; destination: "HAND" | "TOP" | "BOTTOM" }>;
  };
  const [phase, setPhase] = useState<1 | 2>(1);
  const [primaryTargets, setPrimaryTargets] = useState<CollectedTargets | null>(null);

  function weatherFixedRow(engineKey: string | null | undefined): Row | null {
    if (engineKey === "WEATHER_FROST") return "MELEE";
    if (engineKey === "WEATHER_FOG") return "RANGED";
    if (engineKey === "WEATHER_STORM") return "SIEGE";  // backend aplica em SIEGE+RANGED
    if (engineKey === "WEATHER_RAIN") return "SIEGE";   // RAIN agora e fixa em SIEGE
    return null;
  }
  const turnSide = props.currentTurnSide;
  const mySide: Side | null = props.mode === "ONLINE" ? props.viewerSide : turnSide;
  const canAct: boolean = props.mode === "ONLINE"
    ? (props.viewerSide !== null && props.viewerSide === props.currentTurnSide)
    : (props.currentTurnSide !== null);
  const canResumePause = props.pausedBy !== null && mySide === props.pausedBy;

  function handleActivateLeader() {
    if (!canAct || !turnSide) return;
    const leader = props.players[turnSide].deck.leader;
    if (!leader || leader.leaderMode !== "ACTIVE" || props.players[turnSide].leaderUsed) return;
    const ek = leader.ability?.engineKey ?? null;

    // Habilidades de clima do lider: fileira fixa segundo o engineKey, sem perguntar nada
    const fixedWeatherRow = weatherFixedRow(ek);
    if (fixedWeatherRow) {
      guard(async () => {
        await activateLeaderAction({ matchId: props.matchId, side: turnSide!, targetRow: fixedWeatherRow });
      });
      return;
    }
    if (ek === "CLEAR_WEATHER") {
      guard(async () => {
        await activateLeaderAction({ matchId: props.matchId, side: turnSide! });
      });
      return;
    }

    if (ek && NEEDS_TARGET.has(ek)) {
      setActivatingLeader(turnSide);
      setLeaderTargetMode((ek === "RETURN_TO_HAND") ? "ANY" : ((ek === "BOOST" || ek === "HEAL" || ek === "EVOLVE_FACTION" || ek === "PERMANENCE") ? "ALLY" : "ENEMY"));
    } else if (ek && NEEDS_ROW_TARGET.has(ek)) {
      setActivatingLeader(turnSide);
      setLeaderTargetMode((ek === "DESTROY_ROW") ? "ROW_ENEMY" : "ROW_ALLY");
    } else {
      guard(async () => {
        await activateLeaderAction({ matchId: props.matchId, side: turnSide! });
      });
    }
  }

  function handleLeaderRowSelect(row: Row) {
    if (!canAct || !activatingLeader) return;
    const side = activatingLeader;
    guard(async () => {
      await activateLeaderAction({ matchId: props.matchId, side, targetRow: row });
      setActivatingLeader(null);
      setLeaderTargetMode("NONE");
    });
  }

  function handleLeaderTargetClick(target: BoardCard) {
    if (!canAct || !activatingLeader) return;
    const side = activatingLeader;
    const isRowMode = leaderTargetMode === "ROW_ENEMY" || leaderTargetMode === "ROW_ALLY";
    guard(async () => {
      await activateLeaderAction({
        matchId: props.matchId,
        side,
        targetBoardCardId: isRowMode ? undefined : target.boardId,
        targetRow: isRowMode ? target.row : undefined,
      });
      setActivatingLeader(null);
      setLeaderTargetMode("NONE");
    });
  }

  function cancelLeaderActivation() {
    setActivatingLeader(null);
    setLeaderTargetMode("NONE");
  }

  function handleChooseRow(row: Row) {
    if (!canAct || !selectedHandCard) return;
    const ek = selectedHandCard.ability?.engineKey ?? null;
    setChosenRow(row);

    // Habilidades de fileira (BOOST_ROW, MULTIPLY_ROW, DESTROY_ROW, IMMUNE_ROW, WEATHER_RAIN)
    if (ek && NEEDS_ROW_TARGET.has(ek)) {
      setRowTargetMode((ek === "DESTROY_ROW" || ek === "WEATHER_RAIN") ? "ROW_ENEMY" : "ROW_ALLY");
      return;
    }

    // Habilidades com alvo simples
    if (ek && NEEDS_TARGET.has(ek)) {
      setTargetMode((ek === "RETURN_TO_HAND") ? "ANY" : ((ek === "BOOST" || ek === "HEAL" || ek === "EVOLVE_FACTION" || ek === "PERMANENCE") ? "ALLY" : "ENEMY"));
      return;
    }

    // BOOST_MANY (Nutrir) - selecionar N aliados no board
    if (ek === "BOOST_MANY") {
      const max = (selectedHandCard.ability as any)?.targetCount ?? 3;
      setMultiSelectMode({ max, source: "BOARD" });
      setMultiSelectIds([]);
      return;
    }

    // SHUFFLE_AND_DRAW (Ganancia) - selecionar N cartas da mao
    if (ek === "SHUFFLE_AND_DRAW") {
      const max = selectedHandCard.ability?.engineValue ?? 3;
      setMultiSelectMode({ max, source: "HAND" });
      setMultiSelectIds([]);
      return;
    }

    // PROPHECY (Profecia) - revela N do topo e jogador roteia
    if (ek === "PROPHECY") {
      const peekCount = selectedHandCard.ability?.engineValue ?? 3;
      peekDeckTopAction(props.matchId, turnSide!, peekCount).then((cards) => {
        setProphecyCards(cards);
        const initialRouting: Record<string, "HAND" | "TOP" | "BOTTOM" | null> = {};
        for (const c of cards) initialRouting[c.handId] = null;
        setProphecyRouting(initialRouting);
      });
      return;
    }

    // Sem alvo - joga direto
    executePlayCard(row, undefined);
  }

  function executePlayCard(row: Row, targetBoardCardId: string | undefined) {
    submitPlay(row, { targetBoardCardId });
  }

  function submitPlay(row: Row, currentTargets: CollectedTargets) {
    if (!selectedHandCard) return;
    const hasSecondary = !!selectedHandCard.ability?.secondaryEngineKey;

    // Se tem efeito secundario e estamos na fase 1, sai para coletar alvos do secundario
    if (hasSecondary && phase === 1) {
      setPrimaryTargets(currentTargets);
      setPhase(2);
      setChosenRow(row);
      // Limpa modos do primario e configura modos do secundario
      setTargetMode("NONE");
      setRowTargetMode("NONE");
      setMultiSelectMode(null);
      setMultiSelectIds([]);
      const sek = selectedHandCard.ability?.secondaryEngineKey ?? null;
      if (sek && NEEDS_TARGET.has(sek)) {
        setTargetMode((sek === "RETURN_TO_HAND") ? "ANY" : ((sek === "BOOST" || sek === "HEAL" || sek === "EVOLVE_FACTION" || sek === "PERMANENCE") ? "ALLY" : "ENEMY"));
      } else if (sek && NEEDS_ROW_TARGET.has(sek)) {
        setRowTargetMode((sek === "DESTROY_ROW" || sek === "WEATHER_RAIN") ? "ROW_ENEMY" : "ROW_ALLY");
      } else if (sek === "BOOST_MANY") {
        const max = selectedHandCard.ability?.secondaryTargetCount ?? 3;
        setMultiSelectMode({ max, source: "BOARD" });
      } else if (sek === "SHUFFLE_AND_DRAW") {
        const max = selectedHandCard.ability?.secondaryEngineValue ?? 3;
        setMultiSelectMode({ max, source: "HAND" });
      } else if (sek === "PROPHECY") {
        const peekCount = selectedHandCard.ability?.secondaryEngineValue ?? 3;
        peekDeckTopAction(props.matchId, turnSide!, peekCount).then((cards) => {
          setProphecyCards(cards);
          const initialRouting: Record<string, "HAND" | "TOP" | "BOTTOM" | null> = {};
        for (const c of cards) initialRouting[c.handId] = null;
          setProphecyRouting(initialRouting);
        });
      } else {
        // Secundario sem alvo - finaliza ja
        finalSubmit(row, currentTargets, {});
      }
      return;
    }

    // Fase 2 ou sem secondary: monta primary/secondary e finaliza
    const primary = phase === 2 ? (primaryTargets ?? {}) : currentTargets;
    const secondary = phase === 2 ? currentTargets : {};
    finalSubmit(chosenRow ?? row, primary, secondary);
  }

  function finalSubmit(row: Row, primary: CollectedTargets, secondary: CollectedTargets) {
    if (!selectedHandCard || !turnSide) return;
    const handCardId = selectedHandCard.handId;
    guard(async () => {
      await playCardAction({
        matchId: props.matchId,
        side: turnSide,
        handCardId,
        targetRow: row,
        targetBoardCardId: primary.targetBoardCardId,
        effectRow: primary.effectRow,
        multiTargetIds: primary.multiTargetIds,
        prophecyRouting: primary.prophecyRouting,
        secondaryTargetBoardCardId: secondary.targetBoardCardId,
        secondaryEffectRow: secondary.effectRow,
        secondaryMultiTargetIds: secondary.multiTargetIds,
        secondaryProphecyRouting: secondary.prophecyRouting,
      });
      setSelectedHandCard(null);
      setChosenRow(null);
      setTargetMode("NONE");
      setRowTargetMode("NONE");
      setMultiSelectMode(null);
      setMultiSelectIds([]);
      setProphecyCards(null);
      setProphecyRouting({});
      setPhase(1);
      setPrimaryTargets(null);
      setWeatherChoosingRow(false);
    });
  }

  function handleTargetClick(target: BoardCard) {
    if (!canAct || !selectedHandCard) return;
    const rowForSubmit: Row = chosenRow ?? "MELEE";
    // Na fase 2, usa engineKey do secundario. Na fase 1, do principal.
    const ek = phase === 2
      ? (selectedHandCard.ability?.secondaryEngineKey ?? null)
      : (selectedHandCard.ability?.engineKey ?? null);
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
    if (target.isElite) {
      // Confirma elite com prompt simples por enquanto
      if (!confirm("Carta Elite e' imune. Continuar mesmo assim?")) return;
    }
    executePlayCard(rowForSubmit, target.boardId);
  }

  function handleSelectEffectRow(effectRow: Row) {
    if (!canAct || !selectedHandCard) return;
    const rowForSubmit: Row = chosenRow ?? "MELEE";
    submitPlay(rowForSubmit, { effectRow });
  }

  function toggleMultiSelectId(id: string) {
    setMultiSelectIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (multiSelectMode && prev.length >= multiSelectMode.max) return prev;
      return [...prev, id];
    });
  }

  function confirmMultiSelect() {
    if (!selectedHandCard || multiSelectIds.length === 0) return;
    const rowForSubmit: Row = chosenRow ?? "MELEE";
    const ids = [...multiSelectIds];
    setMultiSelectMode(null);
    setMultiSelectIds([]);
    submitPlay(rowForSubmit, { multiTargetIds: ids });
  }

  function cancelMultiSelect() {
    setMultiSelectMode(null);
    setMultiSelectIds([]);
    setSelectedHandCard(null);
    setChosenRow(null);
  }

  function setProphecyDest(handId: string, dest: "HAND" | "TOP" | "BOTTOM") {
    setProphecyRouting((prev) => {
      const current = prev[handId];
      // Se ja esta marcado nesse destino, desmarca (toggle)
      if (current === dest) {
        return { ...prev, [handId]: null };
      }
      // Limpa qualquer outra carta com o mesmo destino (1-por-destino)
      const next: Record<string, "HAND" | "TOP" | "BOTTOM" | null> = { ...prev };
      for (const id of Object.keys(next)) {
        if (next[id] === dest) next[id] = null;
      }
      next[handId] = dest;
      return next;
    });
  }

  function confirmProphecy() {
    if (!selectedHandCard || !prophecyCards) return;
    const rowForSubmit: Row = chosenRow ?? "MELEE";
    const hasHand   = prophecyCards.some((c) => prophecyRouting[c.handId] === "HAND");
    const hasTop    = prophecyCards.some((c) => prophecyRouting[c.handId] === "TOP");
    const hasBottom = prophecyCards.some((c) => prophecyRouting[c.handId] === "BOTTOM");
    if (!hasHand || !hasTop || !hasBottom) {
      alert("Voce precisa escolher exatamente uma carta para Mao, Topo e Fundo.");
      return;
    }
    const routing = prophecyCards
      .filter((c) => prophecyRouting[c.handId] !== null && prophecyRouting[c.handId] !== undefined)
      .map((c) => ({ handId: c.handId, destination: prophecyRouting[c.handId] as "HAND" | "TOP" | "BOTTOM" }));
    setProphecyCards(null);
    setProphecyRouting({});
    submitPlay(rowForSubmit, { prophecyRouting: routing });
  }

  function cancelProphecy() {
    setProphecyCards(null);
    setProphecyRouting({});
    setSelectedHandCard(null);
    setChosenRow(null);
  }

  function cancelPlay() {
    setSelectedHandCard(null);
    setChosenRow(null);
    setTargetMode("NONE");
    setRowTargetMode("NONE");
    setWeatherChoosingRow(false);
    setPhase(1);
    setPrimaryTargets(null);
    setMultiSelectMode(null);
    setMultiSelectIds([]);
    setProphecyCards(null);
    setProphecyRouting({});
  }

  function rowsAllowed(card: HandCard | null): Row[] {
    if (!card) return [];
    return card.rows.split(",").filter(Boolean) as Row[];
  }

  function isRowAvailable(side: Side, row: Row): boolean {
    if (!selectedHandCard) return false;
    if (chosenRow) return false;
    if (side !== turnSide) return false;
    if (selectedHandCard.cardType === "WEATHER") return false;
    return rowsAllowed(selectedHandCard).includes(row);
  }

  function weatherOnRow(row: Row): WeatherInfo | undefined {
    return props.weather.find((w) => w.affectedRow === row);
  }

  function handleSelectHandCard(card: HandCard) {
    if (!canAct) return;
    if (props.status !== "PLAYING") return;
    if (selectedHandCard?.handId === card.handId) {
      setSelectedHandCard(null);
      setWeatherChoosingRow(false);
      return;
    }
    setSelectedHandCard(card);
    setWeatherChoosingRow(false);

    // Carta WEATHER: fluxo especial sem precisar escolher fileira para colocar
    if (card.cardType === "WEATHER") {
      const ek = card.ability?.engineKey ?? null;
      const fixed = weatherFixedRow(ek);
      if (ek === "CLEAR_WEATHER") {
        // Joga sem precisar de fileira
        guard(async () => {
          await playCardAction({
            matchId: props.matchId,
            side: turnSide!,
            handCardId: card.handId,
            targetRow: "MELEE", // backend ignora pra CLEAR_WEATHER
          });
          setSelectedHandCard(null);
        });
        return;
      }
      if (fixed) {
        // FROST/FOG/STORM tem fileira fixa
        guard(async () => {
          await playCardAction({
            matchId: props.matchId,
            side: turnSide!,
            handCardId: card.handId,
            targetRow: fixed,
          });
          setSelectedHandCard(null);
        });
        return;
      }
      // WEATHER_RAIN agora tem fileira fixa SIEGE - cai no branch fixed acima
    }

    // Carta SPECIAL: nao ocupa fileira. Abre direto o modo de alvo da habilidade.
    if (card.cardType === "SPECIAL") {
      const ek = card.ability?.engineKey ?? null;
      // Habilidades de fileira (BOOST_ROW, MULTIPLY_ROW, DESTROY_ROW, IMMUNE_ROW)
      if (ek && NEEDS_ROW_TARGET.has(ek)) {
        setRowTargetMode((ek === "DESTROY_ROW") ? "ROW_ENEMY" : "ROW_ALLY");
        return;
      }
      // Habilidades com alvo simples
      if (ek && NEEDS_TARGET.has(ek)) {
        setTargetMode((ek === "RETURN_TO_HAND") ? "ANY" : ((ek === "BOOST" || ek === "HEAL" || ek === "EVOLVE_FACTION" || ek === "PERMANENCE") ? "ALLY" : "ENEMY"));
        return;
      }
      // Multi-select fontes
      if (ek === "BOOST_MANY") {
        const max = (card.ability as any)?.targetCount ?? 3;
        setMultiSelectMode({ max, source: "BOARD" });
        setMultiSelectIds([]);
        return;
      }
      if (ek === "SHUFFLE_AND_DRAW") {
        const max = card.ability?.engineValue ?? 3;
        setMultiSelectMode({ max, source: "HAND" });
        setMultiSelectIds([]);
        return;
      }
      if (ek === "PROPHECY") {
        const peekCount = card.ability?.engineValue ?? 3;
        peekDeckTopAction(props.matchId, turnSide!, peekCount).then((cards) => {
          setProphecyCards(cards);
          const initialRouting: Record<string, "HAND" | "TOP" | "BOTTOM" | null> = {};
          for (const c of cards) initialRouting[c.handId] = null;
          setProphecyRouting(initialRouting);
        });
        return;
      }
      // Outras habilidades sem alvo: joga direto
      guard(async () => {
        await playCardAction({
          matchId: props.matchId,
          side: turnSide!,
          handCardId: card.handId,
          targetRow: "MELEE", // ignorado pra SPECIAL
        });
        setSelectedHandCard(null);
      });
      return;
    }
  }

  function playWeatherOnRow(row: Row) {
    if (!selectedHandCard || !turnSide) return;
    const handCardId = selectedHandCard.handId;
    guard(async () => {
      await playCardAction({
        matchId: props.matchId,
        side: turnSide,
        handCardId,
        targetRow: row,
      });
      setSelectedHandCard(null);
      setWeatherChoosingRow(false);
    });
  }

  const isOnline = props.mode === "ONLINE";
  const displaySide: Side | null = isOnline ? props.viewerSide : props.currentTurnSide;
  const hand: HandCard[] = displaySide ? props.hands[displaySide] : [];

  // SSE: escuta mudancas do servidor em tempo real
  useEffect(() => {
    if (!isOnline) return;
    if (props.status === "FINISHED") return;
    const eventSource = new EventSource("/api/partidas/" + props.matchId + "/stream");
    eventSource.addEventListener("change", () => {
      router.refresh();
    });
    return () => {
      eventSource.close();
    };
  }, [isOnline, props.status, props.matchId, router]);

  // Quando FINISHED, board fica visivel ao fundo e FinishedScreen aparece como modal

  function cardsOn(side: Side, row: Row): BoardCard[] {
    return props.board.filter((b) => b.side === side && b.row === row);
  }
  function rowTotal(side: Side, row: Row): number {
    return cardsOn(side, row).reduce((s, c) => s + c.power, 0);
  }

    function isCardTargetable(c: BoardCard): boolean {
    if (activatingLeader) {
      if (leaderTargetMode === "ALLY") return c.side === activatingLeader && !c.isElite;
      if (leaderTargetMode === "ENEMY") return c.side !== activatingLeader && !c.isElite;
      if (leaderTargetMode === "ANY") return !c.isElite;
      return false;
    }
    if (targetMode === "ALLY") return c.side === turnSide && !c.isElite;
    if (targetMode === "ENEMY") return c.side !== turnSide && !c.isElite;
    if (targetMode === "ANY") return !c.isElite;
    return false;
  }

  function dispatchCardClick(c: BoardCard) {
    if (activatingLeader) return handleLeaderTargetClick(c);
    return handleTargetClick(c);
  }

  return (
    <>
    <style>{`
      @keyframes v2-pulse-glow {
        0%, 100% { box-shadow: 0 0 16px rgba(253, 224, 71, 1), 0 0 6px rgba(253, 224, 71, 0.85); }
        50% { box-shadow: 0 0 28px rgba(253, 224, 71, 1), 0 0 12px rgba(253, 224, 71, 1); }
      }
      @keyframes v2-card-enter {
        from { opacity: 0; transform: translateY(-30px) scale(0.6) rotateZ(-8deg); }
        70% { opacity: 1; transform: translateY(4px) scale(1.08) rotateZ(2deg); }
        to { opacity: 1; transform: translateY(0) scale(1) rotateZ(0deg); }
      }
      .v2-card-enter {
        animation: v2-card-enter 0.45s cubic-bezier(0.2, 1, 0.4, 1);
      }
    `}</style>
    <div style={{ display: "flex", justifyContent: "center", padding: "0", background: "#0c0a08", minHeight: "100vh" }}>
      <div
        style={{
          position: "relative",
          width: "1400px",
          maxWidth: "100%",
          aspectRatio: "3 / 2",
          backgroundImage: "url('/board.jpg')",
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <Region pos={{ top: "2.8%", left: "30.3%", width: "9.7%", height: "5.5%" }}>
          <PlayerScore p={pA} side="A" turnSide={turnSide} hasPassed={pA.hasPassed} total={rowTotal("A","SIEGE")+rowTotal("A","RANGED")+rowTotal("A","MELEE")} />
        </Region>
        <Region pos={{ top: "2.8%", left: "60%", width: "9.7%", height: "5.5%" }}>
          <PlayerScore p={pB} side="B" turnSide={turnSide} hasPassed={pB.hasPassed} total={rowTotal("B","SIEGE")+rowTotal("B","RANGED")+rowTotal("B","MELEE")} />
        </Region>

        <Region pos={{ top: "8.5%", left: "6.1%", width: "9.8%", height: "17%" }}>
          <LeaderTile p={pA} side="A" turnSide={turnSide} canAct={canAct} onActivate={handleActivateLeader} onShiftClick={() => openLeader(pA)} disabled={isPending} />
        </Region>
        <Region pos={{ top: "30.6%", left: "3.1%", width: "5.8%", height: "14.2%" }}><DeckBox count={pA.deckRealCount} factionColor={pA.deck.faction.color} /></Region>
        <Region pos={{ top: "34%", left: "10.9%", width: "4%", height: "4.5%" }} label={pA.handCount.toString()} />
        <Region pos={{ top: "43.5%", left: "13%", width: "2%", height: "4.5%" }}><CemTile entry={props.lastDiscarded.A} count={pA.discardCount} onClick={() => props.lastDiscarded.A && openLastDiscarded(props.lastDiscarded.A)} /></Region>

        <Region pos={{ top: "58.6%", left: "6.1%", width: "9.7%", height: "17%" }}>
          <LeaderTile p={pB} side="B" turnSide={turnSide} canAct={canAct} onActivate={handleActivateLeader} onShiftClick={() => openLeader(pB)} disabled={isPending} />
        </Region>
        <Region pos={{ top: "80.2%", left: "3.1%", width: "5.7%", height: "13.8%" }}><DeckBox count={pB.deckRealCount} factionColor={pB.deck.faction.color} /></Region>
        <Region pos={{ top: "83.5%", left: "10.9%", width: "4%", height: "4.5%" }} label={pB.handCount.toString()} />
        <Region pos={{ top: "93%", left: "13%", width: "1.8%", height: "4%" }}><CemTile entry={props.lastDiscarded.B} count={pB.discardCount} onClick={() => props.lastDiscarded.B && openLastDiscarded(props.lastDiscarded.B)} /></Region>

        <Region pos={{ top: "20%", left: "22.6%", width: "4%", height: "4%" }} label={rowTotal("A", "SIEGE").toString()} />
        <Region pos={{ top: "40.5%", left: "22.6%", width: "4%", height: "4%" }} label={rowTotal("A", "RANGED").toString()} />
        <Region pos={{ top: "61.5%", left: "22.6%", width: "4%", height: "4%" }} label={rowTotal("A", "MELEE").toString()} />

        <Region pos={{ top: "9.5%", left: "27.5%", width: "23%", height: "21%" }} highlight={isRowAvailable("A", "SIEGE")} weathered={!!weatherOnRow("SIEGE")} onClick={isRowAvailable("A", "SIEGE") ? () => handleChooseRow("SIEGE") : undefined}>
          <CardLane cards={cardsOn("A", "SIEGE")} isTargetable={isCardTargetable} onCardClick={dispatchCardClick} onCardShiftClick={openBoardCard} />
        </Region>
        <Region pos={{ top: "9.5%", left: "52.8%", width: "22.4%", height: "21%" }} highlight={isRowAvailable("B", "SIEGE")} weathered={!!weatherOnRow("SIEGE")} onClick={isRowAvailable("B", "SIEGE") ? () => handleChooseRow("SIEGE") : undefined}>
          <CardLane cards={cardsOn("B", "SIEGE")} isTargetable={isCardTargetable} onCardClick={dispatchCardClick} onCardShiftClick={openBoardCard} />
        </Region>
        <Region pos={{ top: "31%", left: "27.5%", width: "23%", height: "21%" }} highlight={isRowAvailable("A", "RANGED")} weathered={!!weatherOnRow("RANGED")} onClick={isRowAvailable("A", "RANGED") ? () => handleChooseRow("RANGED") : undefined}>
          <CardLane cards={cardsOn("A", "RANGED")} isTargetable={isCardTargetable} onCardClick={dispatchCardClick} onCardShiftClick={openBoardCard} />
        </Region>
        <Region pos={{ top: "31%", left: "52.8%", width: "22.4%", height: "21%" }} highlight={isRowAvailable("B", "RANGED")} weathered={!!weatherOnRow("RANGED")} onClick={isRowAvailable("B", "RANGED") ? () => handleChooseRow("RANGED") : undefined}>
          <CardLane cards={cardsOn("B", "RANGED")} isTargetable={isCardTargetable} onCardClick={dispatchCardClick} onCardShiftClick={openBoardCard} />
        </Region>
        <Region pos={{ top: "52.5%", left: "27.5%", width: "23%", height: "21%" }} highlight={isRowAvailable("A", "MELEE")} weathered={!!weatherOnRow("MELEE")} onClick={isRowAvailable("A", "MELEE") ? () => handleChooseRow("MELEE") : undefined}>
          <CardLane cards={cardsOn("A", "MELEE")} isTargetable={isCardTargetable} onCardClick={dispatchCardClick} onCardShiftClick={openBoardCard} />
        </Region>
        <Region pos={{ top: "52.5%", left: "52.8%", width: "22.4%", height: "21%" }} highlight={isRowAvailable("B", "MELEE")} weathered={!!weatherOnRow("MELEE")} onClick={isRowAvailable("B", "MELEE") ? () => handleChooseRow("MELEE") : undefined}>
          <CardLane cards={cardsOn("B", "MELEE")} isTargetable={isCardTargetable} onCardClick={dispatchCardClick} onCardShiftClick={openBoardCard} />
        </Region>

        <Region pos={{ top: "20%", left: "75.3%", width: "4%", height: "4%" }} label={rowTotal("B", "SIEGE").toString()} />
        <Region pos={{ top: "40.5%", left: "75.3%", width: "4%", height: "4%" }} label={rowTotal("B", "RANGED").toString()} />
        <Region pos={{ top: "61.5%", left: "75.3%", width: "4%", height: "4%" }} label={rowTotal("B", "MELEE").toString()} />

        <Region pos={{ top: "77.2%", left: "21.3%", width: "59.3%", height: "19.5%" }}>
          <HandLane cards={hand} selectedHandId={selectedHandCard?.handId ?? null} onSelect={handleSelectHandCard} onShiftSelect={openHandCard} />
        </Region>

        {/* Barra de controles flutuante sobre a Mao */}
        {/* Grupo esquerdo - antes do texto MAO DO JOGADOR */}
        <div
          style={{
            position: "absolute",
            top: "74.5%",
            left: "22%",
            display: "flex",
            gap: "4px",
            zIndex: 5,
          }}
        >
          <ControlButton onClick={handlePass} disabled={isPending} color="#3f3f46">Passar</ControlButton>
          <ControlButton onClick={handleOfferDraw} disabled={isPending} color="#5b21b6">Empate</ControlButton>
        </div>
        {/* Grupo direito - depois do texto MAO DO JOGADOR */}
        <div
          style={{
            position: "absolute",
            top: "74.5%",
            right: "21%",
            display: "flex",
            gap: "4px",
            zIndex: 5,
          }}
        >
          <ControlButton onClick={handlePause} disabled={isPending} color="#374151">Pausar</ControlButton>
          <ControlButton onClick={handleAbandon} disabled={isPending} color="#7f1d1d">Abandonar</ControlButton>
        </div>
        {error && (
          <div style={{ position: "absolute", top: "70%", left: "21.3%", width: "59.3%", textAlign: "center", color: "#fca5a5", fontSize: "11px", background: "rgba(127, 29, 29, 0.6)", padding: "2px 6px", borderRadius: "3px", zIndex: 6 }}>
            {error}
          </div>
        )}

        {/* Banner de ativacao do lider */}
        {activatingLeader && leaderTargetMode !== "NONE" && (
          <div
            style={{
              position: "absolute",
              top: "73%",
              left: "21.3%",
              width: "59.3%",
              background: "rgba(91, 33, 182, 0.92)",
              border: "1px solid #a78bfa",
              color: "#e9d4ff",
              padding: "6px 10px",
              borderRadius: "4px",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              zIndex: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            }}
          >
            {(leaderTargetMode === "ROW_ENEMY" || leaderTargetMode === "ROW_ALLY") ? (
              <>
                <span>Lider: escolha a fileira {leaderTargetMode === "ROW_ALLY" ? "aliada" : "inimiga"}:</span>
                <button onClick={() => handleLeaderRowSelect("MELEE")} disabled={isPending} style={leaderBtnStyle}>Vanguarda</button>
                <button onClick={() => handleLeaderRowSelect("RANGED")} disabled={isPending} style={leaderBtnStyle}>Distancia</button>
                <button onClick={() => handleLeaderRowSelect("SIEGE")} disabled={isPending} style={leaderBtnStyle}>Cerco</button>
              </>
            ) : (
              <span>Lider: clique numa carta {leaderTargetMode === "ALLY" ? "aliada" : "inimiga"}</span>
            )}
            <button onClick={cancelLeaderActivation} style={{ ...leaderBtnStyle, background: "transparent", border: "none", textDecoration: "underline" }}>cancelar</button>
          </div>
        )}

        {/* Banner de target da habilidade da carta */}
        {targetMode !== "NONE" && (
          <div
            style={{
              position: "absolute",
              top: "73%",
              left: "21.3%",
              width: "59.3%",
              background: "rgba(180, 83, 9, 0.92)",
              border: "1px solid #fbbf24",
              color: "#fef3c7",
              padding: "6px 10px",
              borderRadius: "4px",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              zIndex: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            }}
          >
            <span>Clique numa carta {targetMode === "ALLY" ? "aliada" : targetMode === "ENEMY" ? "inimiga" : "do tabuleiro (qualquer)"} no tabuleiro</span>
            {chosenRow && (
              <button
                onClick={() => executePlayCard(chosenRow!, undefined)}
                disabled={isPending}
                style={{ ...leaderBtnStyle, background: "#525252" }}
                title="A carta entra em campo mas a habilidade nao tera efeito"
              >
                Jogar sem efeito
              </button>
            )}
            <button onClick={cancelPlay} style={{ ...leaderBtnStyle, background: "transparent", border: "none", textDecoration: "underline" }}>cancelar</button>
          </div>
        )}

        {/* Banner de selecao de fileira para habilidades de fileira */}
        {rowTargetMode !== "NONE" && (
          <div
            style={{
              position: "absolute",
              top: "73%",
              left: "21.3%",
              width: "59.3%",
              background: "rgba(180, 83, 9, 0.92)",
              border: "1px solid #fbbf24",
              color: "#fef3c7",
              padding: "6px 10px",
              borderRadius: "4px",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              zIndex: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            }}
          >
            <span>Escolha a fileira {rowTargetMode === "ROW_ALLY" ? "aliada" : "inimiga"} alvo:</span>
            <button onClick={() => handleSelectEffectRow("MELEE")} disabled={isPending} style={{ ...leaderBtnStyle, background: "#b45309" }}>Vanguarda</button>
            <button onClick={() => handleSelectEffectRow("RANGED")} disabled={isPending} style={{ ...leaderBtnStyle, background: "#b45309" }}>Distancia</button>
            <button onClick={() => handleSelectEffectRow("SIEGE")} disabled={isPending} style={{ ...leaderBtnStyle, background: "#b45309" }}>Cerco</button>
            <button onClick={cancelPlay} style={{ ...leaderBtnStyle, background: "transparent", border: "none", textDecoration: "underline" }}>cancelar</button>
          </div>
        )}

        {/* Banner de WEATHER_RAIN - escolha fileira do clima */}
        {weatherChoosingRow && (
          <div
            style={{
              position: "absolute",
              top: "73%",
              left: "21.3%",
              width: "59.3%",
              background: "rgba(30, 58, 138, 0.92)",
              border: "1px solid #60a5fa",
              color: "#dbeafe",
              padding: "6px 10px",
              borderRadius: "4px",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              zIndex: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            }}
          >
            <span>Escolha onde a chuva cai:</span>
            <button onClick={() => playWeatherOnRow("MELEE")} disabled={isPending} style={{ ...leaderBtnStyle, background: "#1e40af" }}>Vanguarda</button>
            <button onClick={() => playWeatherOnRow("RANGED")} disabled={isPending} style={{ ...leaderBtnStyle, background: "#1e40af" }}>Distancia</button>
            <button onClick={() => playWeatherOnRow("SIEGE")} disabled={isPending} style={{ ...leaderBtnStyle, background: "#1e40af" }}>Cerco</button>
            <button onClick={cancelPlay} style={{ ...leaderBtnStyle, background: "transparent", border: "none", textDecoration: "underline" }}>cancelar</button>
          </div>
        )}

        {props.status === "REDRAW" && canAct && mySide && (
          <RedrawModal
            hand={props.hands[mySide]}
            redrawsLeft={props.players[mySide].redrawsLeft}
            selection={redrawSelection}
            onToggle={toggleRedraw}
            onConfirm={confirmRedraw}
            onSkip={skipRedraw}
            disabled={isPending}
            playerName={props.players[mySide].username}
          />
        )}

        {multiSelectMode && selectedHandCard && (
          <MultiSelectModal
            mode={multiSelectMode}
            selectedIds={multiSelectIds}
            onToggle={toggleMultiSelectId}
            onConfirm={confirmMultiSelect}
            onCancel={cancelMultiSelect}
            disabled={isPending}
            handCards={turnSide ? props.hands[turnSide].filter((c) => c.handId !== selectedHandCard.handId) : []}
            boardCards={turnSide ? props.board.filter((c) => c.side === turnSide && !c.isElite) : []}
            discardCards={turnSide ? props.discards[turnSide] : []}
          />
        )}

        {prophecyCards && (
          <ProphecyModal
            cards={prophecyCards}
            routing={prophecyRouting}
            onSetDest={setProphecyDest}
            onConfirm={confirmProphecy}
            onCancel={cancelProphecy}
            disabled={isPending}
          />
        )}

        {props.pausedBy && (
          <PauseOverlay pausedBy={props.pausedBy} players={props.players} canResume={canResumePause} onResume={handleResume} disabled={isPending} />
        )}

        {props.drawOfferedBy && (
          <DrawOfferBar
            offeredByMe={(isOnline ? props.drawOfferedBy === props.viewerSide : props.drawOfferedBy === turnSide)}
            onAccept={() => handleRespondDraw(true)}
            onDecline={() => handleRespondDraw(false)}
            disabled={isPending}
          />
        )}

        {props.status === "FINISHED" && (
          <FinishedScreen
            winnerSide={props.winnerSide}
            players={props.players}
            mode={props.mode}
            events={props.currentRoundEvents}
          />
        )}
        <Region pos={{ top: "8.5%", left: "84%", width: "14.8%", height: "41%" }}><HistoryPanel events={props.currentRoundEvents} playerNames={{ A: pA.username, B: pB.username }} currentRound={props.round} /></Region>
        <Region pos={{ top: "59.5%", left: "83.5%", width: "14.8%", height: "17%" }}><WeatherPanel weather={props.weather} /></Region>
        <Region pos={{ top: "77.5%", left: "83.5%", width: "7%", height: "19%" }}><SideEffectsPanel sideLabel="A" data={props.sideEffects.A} playedSpecials={props.playedSpecials.A} onCardClick={openPlayedSpecial} /></Region>
        <Region pos={{ top: "77.5%", left: "91%", width: "7%", height: "19%" }}><SideEffectsPanel sideLabel="B" data={props.sideEffects.B} playedSpecials={props.playedSpecials.B} onCardClick={openPlayedSpecial} /></Region>
      </div>
    </div>
      <CardModal card={viewingCard} onClose={() => setViewingCard(null)} />
    </>
  );
}


function FinishedScreen({ winnerSide, players, mode, events }: { winnerSide: Side | "DRAW" | null; players: Record<Side, PlayerInfo>; mode: string; events: MatchEvent[] }) {
  const [showLog, setShowLog] = useState(false);
  let title = "";
  let subtitle = "";
  if (winnerSide === "DRAW") {
    title = "Empate!";
    subtitle = "Ambos ganharam o mesmo numero de rondas.";
  } else if (winnerSide === "A" || winnerSide === "B") {
    const p = players[winnerSide];
    title = p.username + " venceu!";
    subtitle = "Lado " + winnerSide + " - " + p.deck.faction.name;
  }
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 250, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "rgba(0,0,0,0.78)", fontFamily: "system-ui, sans-serif", overflow: "auto" }}>
      <div style={{ background: "rgba(24, 24, 27, 0.96)", border: "2px solid rgba(180, 83, 9, 0.5)", borderRadius: "16px", padding: showLog ? "32px" : "48px", textAlign: "center", maxWidth: showLog ? "720px" : "600px", width: "100%", maxHeight: "90vh", overflow: "auto" }}>
        <p style={{ fontSize: "11px", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "8px" }}>Fim de partida</p>
        <h1 style={{ fontSize: "44px", fontWeight: "bold", color: "#fcd34d", margin: 0, marginBottom: "6px" }}>{title}</h1>
        <p style={{ color: "#a8a29e", fontStyle: "italic", marginBottom: "24px" }}>{subtitle}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: "32px", marginBottom: "24px" }}>
          {(["A", "B"] as Side[]).map((s) => {
            const p = players[s];
            return (
              <div key={s}>
                <p style={{ color: "#a8a29e", fontSize: "12px", margin: 0 }}>{p.username}</p>
                <p style={{ fontSize: "26px", fontFamily: "monospace", fontWeight: "bold", color: "#fcd34d", margin: 0 }}>{p.roundsWon} ronda(s)</p>
              </div>
            );
          })}
        </div>

        {showLog && (
          <div style={{ marginBottom: "20px", textAlign: "left", background: "rgba(15,15,16,0.7)", border: "1px solid rgba(82, 82, 91, 0.5)", borderRadius: "8px", padding: "8px", maxHeight: "40vh", overflow: "auto" }}>
            <MatchEventLog events={events} playerNames={{ A: players.A.username, B: players.B.username }} currentRound={0} />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowLog((v) => !v)}
            style={{ background: "#3f3f46", color: "#e4e4e7", border: "1px solid rgba(212, 160, 74, 0.3)", borderRadius: "6px", padding: "10px 20px", fontSize: "13px", fontWeight: "bold", cursor: "pointer" }}
          >
            {showLog ? "Ocultar log" : "Ver log da \u00faltima ronda"}
          </button>
          <a href={mode === "ONLINE" ? "/lobby" : "/partidas"} style={{ display: "inline-block", background: "#d97706", color: "#1c1917", padding: "10px 20px", borderRadius: "6px", fontWeight: "bold", textDecoration: "none", fontSize: "13px" }}>Voltar</a>
        </div>
      </div>
    </div>
  );
}

function PauseOverlay({ pausedBy, players, canResume, onResume, disabled }: { pausedBy: Side; players: Record<Side, PlayerInfo>; canResume: boolean; onResume: () => void; disabled: boolean }) {
  const p = players[pausedBy];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "#18181b", border: "2px solid #b45309", borderRadius: "16px", padding: "32px", textAlign: "center", maxWidth: "440px", width: "100%", color: "#e9d9b6", fontFamily: "system-ui, sans-serif" }}>
        <p style={{ fontSize: "11px", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "8px" }}>Partida pausada</p>
        <p style={{ fontSize: "36px", color: "#fcd34d", fontWeight: "bold", margin: 0, marginBottom: "12px" }}>{"\u23F8"} Pausa</p>
        <p style={{ color: "#d4d4d8", fontSize: "13px", marginBottom: "24px" }}>
          Pausada por <strong>{p.username}</strong> (lado {pausedBy}).
          {canResume ? " Voce pausou - clique abaixo para retomar." : " Aguardando o jogador que pausou retomar."}
        </p>
        {canResume ? (
          <button
            onClick={onResume}
            disabled={disabled}
            style={{ background: "#d97706", color: "#1c1917", border: "none", borderRadius: "6px", padding: "10px 24px", fontWeight: "bold", fontSize: "14px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
          >
            {disabled ? "Retomando..." : "Retomar partida"}
          </button>
        ) : (
          <p style={{ color: "#a8a29e", fontSize: "11px", fontStyle: "italic" }}>Aproveite a pausa.</p>
        )}
      </div>
    </div>
  );
}

function DrawOfferBar({ offeredByMe, onAccept, onDecline, disabled }: { offeredByMe: boolean; onAccept: () => void; onDecline: () => void; disabled: boolean }) {
  return (
    <div style={{ position: "absolute", top: "67%", left: "21.3%", width: "59.3%", background: "rgba(91, 33, 182, 0.92)", border: "1px solid #a78bfa", color: "#e9d4ff", padding: "8px 12px", borderRadius: "4px", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", zIndex: 9, boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>
      <div>
        <p style={{ margin: 0, fontWeight: "bold" }}>
          {offeredByMe ? "Voce ofereceu empate. Aguardando resposta do oponente..." : "O oponente esta oferecendo empate."}
        </p>
        {!offeredByMe && <p style={{ margin: 0, fontSize: "10px", opacity: 0.8 }}>Aceitar encerra a partida sem vencedor.</p>}
      </div>
      {!offeredByMe && (
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={onAccept} disabled={disabled} style={{ background: "#7c3aed", color: "#fafafa", border: "none", borderRadius: "4px", padding: "5px 12px", fontWeight: "bold", fontSize: "11px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>
            Aceitar
          </button>
          <button onClick={onDecline} disabled={disabled} style={{ background: "#3f3f46", color: "#d4d4d8", border: "1px solid rgba(167, 139, 250, 0.4)", borderRadius: "4px", padding: "5px 12px", fontSize: "11px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>
            Recusar
          </button>
        </div>
      )}
    </div>
  );
}
function Region({
  pos,
  label,
  children,
  highlight,
  weathered,
  onClick,
}: {
  pos: { top: string; left: string; width: string; height: string };
  label?: string;
  children?: React.ReactNode;
  highlight?: boolean;
  weathered?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        height: pos.height,
        border: highlight ? "2px solid #fde047" : (weathered ? "2px solid rgba(96, 165, 250, 0.7)" : "none"),
        background: highlight
          ? "rgba(253, 224, 71, 0.18)"
          : (weathered ? "linear-gradient(rgba(30, 58, 138, 0.4), rgba(15, 23, 42, 0.55))" : "transparent"),
        boxShadow: highlight
          ? "0 0 16px rgba(253, 224, 71, 0.6) inset"
          : (weathered ? "0 0 16px rgba(96, 165, 250, 0.45) inset" : undefined),
        cursor: onClick ? "pointer" : "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontSize: "11px",
        color: "#f0d49a",
        padding: "4px",
        fontFamily: "system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {children ?? label}
    </div>
  );
}

function CardLane({ cards, isTargetable, onCardClick, onCardShiftClick }: { cards: BoardCard[]; isTargetable: (c: BoardCard) => boolean; onCardClick: (c: BoardCard) => void; onCardShiftClick: (c: BoardCard) => void }) {
  if (cards.length === 0) {
    return <span style={{ color: "#444", fontSize: "9px", fontStyle: "italic" }}>vazia</span>;
  }
  return (
    <div
      style={{
        display: "flex",
        gap: "4px",
        width: "100%",
        height: "100%",
        overflowX: "auto",
        overflowY: "hidden",
        padding: "2px",
        alignItems: "center",
      }}
    >
      {cards.map((c) => (
        <MiniCard key={c.boardId} c={c} targetable={isTargetable(c)} onClick={() => onCardClick(c)} onShiftClick={() => onCardShiftClick(c)} />
      ))}
    </div>
  );
}

function HandLane({ cards, selectedHandId, onSelect, onShiftSelect }: { cards: HandCard[]; selectedHandId: string | null; onSelect: (c: HandCard) => void; onShiftSelect: (c: HandCard) => void }) {
  if (cards.length === 0) {
    return <span style={{ color: "#666", fontSize: "10px", fontStyle: "italic" }}>Mao vazia</span>;
  }
  return (
    <div
      style={{
        display: "flex",
        gap: "4px",
        width: "100%",
        height: "100%",
        overflowX: "auto",
        overflowY: "hidden",
        padding: "4px",
        alignItems: "center",
        justifyContent: cards.length < 8 ? "center" : "flex-start",
      }}
    >
      {cards.map((c) => (
        <HandCardTile key={c.handId} c={c} isSelected={selectedHandId === c.handId} onClick={() => onSelect(c)} onShiftClick={() => onShiftSelect(c)} />
      ))}
    </div>
  );
}

function HandCardTile({ c, isSelected, onClick, onShiftClick }: { c: HandCard; isSelected: boolean; onClick: () => void; onShiftClick: () => void }) {
  return (
    <CardTooltip card={{ name: c.name, power: c.power, rarity: c.rarity, cardType: c.cardType, imageUrl: c.imageUrl, frameUrl: c.frameUrl, faction: c.faction, ability: c.ability ? { name: c.ability.name, description: c.ability.description } : null }}>
    <div
      onClick={(e) => { if (e.shiftKey) { e.stopPropagation(); onShiftClick(); return; } onClick(); }}
      style={{
        flexShrink: 0,
        width: "62px",
        height: "93px",
        borderRadius: "4px",
        border: "2px solid " + (isSelected ? "#fde047" : (c.isElite ? "#fbbf24" : c.faction.color)),
        backgroundImage: c.frameUrl
          ? "url(" + c.frameUrl + ")"
          : c.imageUrl
          ? "url(" + c.imageUrl + ")"
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#1a0f06",
        position: "relative",
        boxShadow: isSelected ? "0 0 24px rgba(253, 224, 71, 1), 0 0 8px rgba(253, 224, 71, 0.85)" : (c.isElite ? "0 0 8px rgba(251, 191, 36, 0.7)" : "0 2px 4px rgba(0,0,0,0.6)"),
        cursor: "pointer",
        transform: isSelected ? "translateY(-12px) scale(1.15)" : "none",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        zIndex: isSelected ? 20 : 1,
        animation: isSelected ? "v2-pulse-glow 1.4s ease-in-out infinite" : "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "2px",
          right: "2px",
          width: "16px",
          height: "16px",
          background: "radial-gradient(circle, #d4a04a 0%, #8b6019 100%)",
          color: "#1a0f06",
          fontSize: "10px",
          fontWeight: "bold",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #3d2817",
        }}
      >
        {c.power}
      </span>
      <span
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          fontSize: "8px",
          textAlign: "center",
          padding: "1px 2px",
          color: "#e9d9b6",
          background: "linear-gradient(to top, rgba(20, 12, 4, 0.95) 0%, transparent 100%)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {c.name}
      </span>
    </div>
    </CardTooltip>
  );
}

function MiniCard({ c, targetable, onClick, onShiftClick }: { c: BoardCard; targetable: boolean; onClick: () => void; onShiftClick: () => void }) {
  return (
    <CardTooltip card={{ name: c.name, power: c.power, basePower: c.basePower, rarity: c.rarity, cardType: c.cardType, imageUrl: c.imageUrl, frameUrl: c.frameUrl, faction: c.faction, ability: c.ability, shielded: c.shielded, isToken: c.isToken }}>
    <div
      className="v2-card-enter"
      onClick={(e) => { if (e.shiftKey) { e.stopPropagation(); onShiftClick(); return; } if (targetable) onClick(); }}
      style={{
        flexShrink: 0,
        width: "44px",
        height: "66px",
        borderRadius: "3px",
        border: "1.5px solid " + (targetable ? "#fde047" : (c.isElite ? "#fbbf24" : c.faction.color)),
        cursor: "pointer",
        backgroundImage: c.frameUrl
          ? "url(" + c.frameUrl + ")"
          : c.imageUrl
          ? "url(" + c.imageUrl + ")"
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#1a0f06",
        position: "relative",
        boxShadow: targetable ? "0 0 16px rgba(253, 224, 71, 1), 0 0 6px rgba(253, 224, 71, 0.85)" : (c.isElite ? "0 0 6px rgba(251, 191, 36, 0.7)" : "0 1px 3px rgba(0,0,0,0.6)"),
        animation: targetable ? "v2-pulse-glow 1.2s ease-in-out infinite" : "none",
        transition: "transform 0.15s",
        transform: targetable ? "scale(1.05)" : "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "1px",
          right: "1px",
          width: "14px",
          height: "14px",
          background: "radial-gradient(circle, #d4a04a 0%, #8b6019 100%)",
          color: "#1a0f06",
          fontSize: "9px",
          fontWeight: "bold",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #3d2817",
        }}
      >
        {c.power}
      </span>
      {c.shielded && (
        <span
          style={{
            position: "absolute",
            top: "1px",
            left: "1px",
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: "rgba(30, 58, 138, 0.9)",
            color: "#bfdbfe",
            fontSize: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ◆
        </span>
      )}
    </div>
    </CardTooltip>
  );
}


function HistoryPanel({ events, playerNames, currentRound }: { events: MatchEvent[]; playerNames: Record<Side, string>; currentRound: number }) {
  return (
    <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
      <MatchEventLog events={events} playerNames={playerNames} currentRound={currentRound} />
    </div>
  );
}


function WeatherPanel({ weather }: { weather: WeatherInfo[] }) {
  const rowLabel: Record<string, string> = { MELEE: "Corpo-a-corpo", RANGED: "Distancia", SIEGE: "Cerco" };
  const weatherIcon: Record<string, string> = {
    WEATHER_FROST: "❄",
    WEATHER_FOG: "🌫",
    WEATHER_RAIN: "🌧",
    WEATHER_STORM: "⛈",
  };
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "6px", gap: "4px", overflow: "auto" }}>
      <div style={{ fontSize: "10px", color: "#94a3b8", textAlign: "center", marginBottom: "4px", fontWeight: "bold" }}>
        CLIMA / EFEITOS
      </div>
      {weather.length === 0 ? (
        <div style={{ color: "#555", fontSize: "10px", fontStyle: "italic", textAlign: "center" }}>
          Sem clima ativo
        </div>
      ) : (
        weather.map((w, i) => (
          <div
            key={i}
            style={{
              background: "rgba(30, 58, 138, 0.4)",
              border: "1px solid rgba(96, 165, 250, 0.5)",
              borderRadius: "3px",
              padding: "4px 6px",
              fontSize: "10px",
              color: "#bfdbfe",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span style={{ fontSize: "14px" }}>{weatherIcon[w.weatherKey] ?? "⛅"}</span>
            <div style={{ flex: 1, lineHeight: 1.2 }}>
              <div style={{ fontWeight: "bold" }}>{w.cardName}</div>
              <div style={{ fontSize: "9px", color: "#7dd3fc" }}>{rowLabel[w.affectedRow] ?? w.affectedRow}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

interface SideEffectsData {
  immunities: Array<{ row: "MELEE" | "RANGED" | "SIEGE"; turnsLeft: number }>;
  auras: Array<{ engineKey: string; amount: number }>;
  weathers: Array<{ weatherKey: string; affectedRow: "MELEE" | "RANGED" | "SIEGE" }>;
}

interface PlayedSpecial {
  cardId: string;
  name: string;
  power: number;
  rarity: string;
  cardType: string;
  imageUrl: string | null;
  frameUrl: string | null;
  faction: { name: string; color: string };
  ability: { name: string; description: string } | null;
}

function SideEffectsPanel({ sideLabel, data, playedSpecials, onCardClick }: { sideLabel: string; data: SideEffectsData; playedSpecials: PlayedSpecial[]; onCardClick: (p: PlayedSpecial) => void }) {
  const rowAbbr: Record<string, string> = { MELEE: "M", RANGED: "D", SIEGE: "C" };
  const weatherIcon: Record<string, string> = {
    WEATHER_RAIN: "\ud83c\udf27\ufe0f",
    WEATHER_FROST: "\u2744\ufe0f",
    WEATHER_FOG: "\ud83c\udf2b\ufe0f",
    WEATHER_STORM: "\u26a1",
  };
  const auraIcon: Record<string, string> = {
    BLOOD_MOON: "\ud83c\udf15",
  };
  const totalEffects = data.immunities.length + data.auras.length + data.weathers.length + playedSpecials.length;
  return (
    <div style={{ width: "100%", height: "100%", padding: "5px", background: "rgba(15, 12, 8, 0.78)", border: "1px solid rgba(196, 144, 76, 0.3)", borderRadius: "4px", fontFamily: "system-ui, sans-serif", color: "#e9d9b6", overflow: "auto" }}>
      <div style={{ fontSize: "9px", color: "#c4904c", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px", fontWeight: "bold", textAlign: "center" }}>{sideLabel}</div>
      {totalEffects === 0 && <div style={{ fontSize: "8px", color: "#71717a", textAlign: "center", marginTop: "8px", fontStyle: "italic" }}>vazio</div>}
      {data.weathers.map((w, i) => (
        <div key={"w" + i} style={{ fontSize: "9px", marginBottom: "2px", padding: "2px 4px", background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.4)", borderRadius: "3px", display: "flex", alignItems: "center", gap: "3px" }}>
          <span style={{ fontSize: "11px" }}>{weatherIcon[w.weatherKey] ?? "\u26c5"}</span>
          <span style={{ color: "#7dd3fc" }}>{rowAbbr[w.affectedRow]}</span>
        </div>
      ))}
      {data.immunities.map((m, i) => (
        <div key={"i" + i} style={{ fontSize: "9px", marginBottom: "2px", padding: "2px 4px", background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.4)", borderRadius: "3px", display: "flex", alignItems: "center", gap: "3px" }}>
          <span style={{ fontSize: "11px" }}>{"\ud83d\udee1\ufe0f"}</span>
          <span style={{ color: "#d8b4fe" }}>{rowAbbr[m.row]}/{m.turnsLeft}t</span>
        </div>
      ))}
      {data.auras.map((a, i) => (
        <div key={"a" + i} style={{ fontSize: "9px", marginBottom: "2px", padding: "2px 4px", background: "rgba(220, 38, 38, 0.15)", border: "1px solid rgba(220, 38, 38, 0.4)", borderRadius: "3px", display: "flex", alignItems: "center", gap: "3px" }}>
          <span style={{ fontSize: "11px" }}>{auraIcon[a.engineKey] ?? "✨"}</span>
          <span style={{ color: "#fca5a5" }}>+{a.amount}</span>
        </div>
      ))}
      {playedSpecials.map((p, i) => (
        <CardTooltip key={"p" + i} card={{
          name: p.name,
          power: p.power,
          rarity: p.rarity,
          cardType: p.cardType,
          imageUrl: p.imageUrl,
          frameUrl: p.frameUrl,
          faction: p.faction,
          ability: p.ability,
        }}>
          <div onClick={() => onCardClick(p)} style={{ fontSize: "9px", marginTop: "3px", padding: "3px 4px", background: "rgba(245, 158, 11, 0.10)", border: "1px solid rgba(245, 158, 11, 0.35)", borderRadius: "3px", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
            {(p.frameUrl || p.imageUrl) ? (
              <img src={(p.frameUrl ?? p.imageUrl) as string} alt={p.name} style={{ width: "18px", height: "24px", objectFit: "cover", borderRadius: "2px", flexShrink: 0 }} />
            ) : (
              <span style={{ fontSize: "11px", flexShrink: 0 }}>{p.cardType === "WEATHER" ? "⛅" : "✦"}</span>
            )}
            <span style={{ color: "#fcd34d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "8px" }}>{p.name}</span>
          </div>
        </CardTooltip>
      ))}
    </div>
  );
}

const leaderBtnStyle: React.CSSProperties = {
  background: "#7c3aed",
  color: "#fff",
  border: "1px solid #a78bfa",
  borderRadius: "3px",
  padding: "2px 8px",
  fontSize: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};



function ProphecyModal({ cards, routing, onSetDest, onConfirm, onCancel, disabled }: {
  cards: { handId: string; name: string; power: number; cardType: string; imageUrl: string | null }[];
  routing: Record<string, "HAND" | "TOP" | "BOTTOM" | null>;
  onSetDest: (handId: string, dest: "HAND" | "TOP" | "BOTTOM") => void;
  onConfirm: () => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  const handUsed   = Object.values(routing).filter((v) => v === "HAND").length;
  const topUsed    = Object.values(routing).filter((v) => v === "TOP").length;
  const bottomUsed = Object.values(routing).filter((v) => v === "BOTTOM").length;
  const ready = handUsed === 1 && topUsed === 1 && bottomUsed === 1;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "#18181b", border: "2px solid #a78bfa", borderRadius: "10px", padding: "20px", maxWidth: "700px", width: "100%", maxHeight: "85vh", overflow: "auto", color: "#e9d9b6", fontFamily: "system-ui, sans-serif" }}>
        <h2 style={{ fontSize: "18px", color: "#c4b5fd", margin: 0, marginBottom: "4px" }}>Profecia - Veja seu futuro</h2>
        <p style={{ fontSize: "12px", color: "#a8a29e", margin: 0, marginBottom: "4px" }}>
          Voce ve as proximas {cards.length} cartas do topo do seu deck. Escolha 1 para a Mao, 1 para o Topo e 1 para o Fundo.
        </p>
        <p style={{ fontSize: "11px", margin: 0, marginBottom: "14px" }}>
          <span style={{ color: handUsed   === 1 ? "#16a34a" : "#71717a", marginRight: "10px" }}>Mao: {handUsed}/1</span>
          <span style={{ color: topUsed    === 1 ? "#d97706" : "#71717a", marginRight: "10px" }}>Topo: {topUsed}/1</span>
          <span style={{ color: bottomUsed === 1 ? "#dc2626" : "#71717a" }}>Fundo: {bottomUsed}/1</span>
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
          {cards.map((c, idx) => (
            <div key={c.handId} style={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: "6px", padding: "8px 10px", display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#a8a29e", width: "20px" }}>{idx + 1}</div>
              {c.imageUrl && <img src={c.imageUrl} alt={c.name} style={{ width: "36px", height: "50px", objectFit: "cover", borderRadius: "3px" }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "bold" }}>{c.name}</div>
                <div style={{ fontSize: "10px", color: "#a8a29e" }}>{c.cardType} - Poder {c.power}</div>
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                <ProphecyButton onClick={() => onSetDest(c.handId, "HAND")} active={routing[c.handId] === "HAND"} color="#16a34a">Mao</ProphecyButton>
                <ProphecyButton onClick={() => onSetDest(c.handId, "TOP")} active={routing[c.handId] === "TOP"} color="#d97706">Topo</ProphecyButton>
                <ProphecyButton onClick={() => onSetDest(c.handId, "BOTTOM")} active={routing[c.handId] === "BOTTOM"} color="#dc2626">Fundo</ProphecyButton>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button onClick={onCancel} disabled={disabled} style={{ background: "#3f3f46", color: "#e4e4e7", border: "1px solid rgba(212, 160, 74, 0.3)", borderRadius: "4px", padding: "8px 16px", fontSize: "13px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>Cancelar</button>
          <button onClick={onConfirm} disabled={disabled || !ready} style={{ background: "#7c3aed", color: "#fafafa", border: "none", borderRadius: "4px", padding: "8px 16px", fontSize: "13px", fontWeight: "bold", cursor: (disabled || !ready) ? "not-allowed" : "pointer", opacity: (disabled || !ready) ? 0.5 : 1 }}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

function ProphecyButton({ onClick, active, color, children }: { onClick: () => void; active: boolean; color: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 8px",
        fontSize: "10px",
        fontWeight: "bold",
        borderRadius: "3px",
        border: "none",
        background: active ? color : "#3f3f46",
        color: active ? "#fafafa" : "#a8a29e",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}
function MultiSelectModal({ mode, selectedIds, onToggle, onConfirm, onCancel, disabled, handCards, boardCards, discardCards }: {
  mode: { max: number; source: "BOARD" | "HAND" | "DISCARD" };
  selectedIds: string[];
  onToggle: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  disabled: boolean;
  handCards: HandCard[];
  boardCards: BoardCard[];
  discardCards: Array<{ handId: string; name: string; power: number; imageUrl: string | null; frameUrl: string | null; faction: { name: string; color: string } }>;
}) {
  const items = mode.source === "HAND"
    ? handCards.map((c) => ({ id: c.handId, name: c.name, power: c.power, faction: c.faction, imageUrl: c.imageUrl, frameUrl: c.frameUrl }))
    : mode.source === "DISCARD"
      ? discardCards.map((c) => ({ id: c.handId, name: c.name, power: c.power, faction: c.faction, imageUrl: c.imageUrl, frameUrl: c.frameUrl }))
      : boardCards.map((c) => ({ id: c.boardId, name: c.name, power: c.power, faction: c.faction, imageUrl: c.imageUrl, frameUrl: c.frameUrl }));
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ background: "#18181b", border: "2px solid #f59e0b", borderRadius: "10px", padding: "20px", maxWidth: "800px", width: "100%", maxHeight: "85vh", overflow: "auto", color: "#e9d9b6", fontFamily: "system-ui, sans-serif" }}>
        <h2 style={{ fontSize: "18px", color: "#fcd34d", margin: 0, marginBottom: "8px" }}>
          {mode.source === "HAND" ? "Escolha cartas da mao" : mode.source === "DISCARD" ? "Escolha cartas do cemiterio" : "Escolha as cartas aliadas"}
        </h2>
        <p style={{ fontSize: "12px", color: "#a8a29e", margin: 0, marginBottom: "14px" }}>
          {mode.source === "HAND" ? "Selecione ate " + mode.max + " carta(s) da mao para devolver ao deck." : mode.source === "DISCARD" ? "Selecione ate " + mode.max + " unidade(s) do cemiterio para ressuscitar." : "Selecione ate " + mode.max + " carta(s) aliada(s) para receber o efeito."}
          <span style={{ marginLeft: "6px", color: "#fcd34d", fontFamily: "monospace" }}>
            {selectedIds.length}/{mode.max}
          </span>
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "8px", marginBottom: "14px" }}>
          {items.length === 0 && (
            <p style={{ color: "#a8a29e", fontStyle: "italic", gridColumn: "1 / -1" }}>Nenhuma carta disponivel.</p>
          )}
          {items.map((c) => {
            const selected = selectedIds.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => onToggle(c.id)}
                disabled={disabled}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "2px solid " + (selected ? "#f59e0b" : "#3f3f46"),
                  background: selected ? "rgba(180, 83, 9, 0.3)" : "#27272a",
                  color: "#e9d9b6",
                  cursor: disabled ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: "bold" }}>{c.name}</div>
                <div style={{ fontSize: "10px", color: "#a8a29e" }}>Poder {c.power}</div>
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            onClick={onCancel}
            disabled={disabled}
            style={{ background: "#3f3f46", color: "#e4e4e7", border: "1px solid rgba(212, 160, 74, 0.3)", borderRadius: "4px", padding: "8px 16px", fontSize: "13px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={disabled || selectedIds.length === 0}
            style={{ background: "#d97706", color: "#1c1917", border: "none", borderRadius: "4px", padding: "8px 16px", fontSize: "13px", fontWeight: "bold", cursor: (disabled || selectedIds.length === 0) ? "not-allowed" : "pointer", opacity: (disabled || selectedIds.length === 0) ? 0.5 : 1 }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
function RedrawModal({ hand, redrawsLeft, selection, onToggle, onConfirm, onSkip, disabled, playerName }: {
  hand: HandCard[];
  redrawsLeft: number;
  selection: Set<string>;
  onToggle: (handId: string) => void;
  onConfirm: () => void;
  onSkip: () => void;
  disabled: boolean;
  playerName: string;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.78)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#18181b",
          border: "2px solid #b45309",
          borderRadius: "10px",
          padding: "20px",
          maxWidth: "900px",
          width: "100%",
          maxHeight: "85vh",
          overflow: "auto",
          color: "#e9d9b6",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h2 style={{ fontSize: "18px", color: "#fcd34d", margin: 0, marginBottom: "4px" }}>
          Redraw - {playerName}
        </h2>
        <p style={{ fontSize: "12px", color: "#a8a29e", margin: 0, marginBottom: "12px" }}>
          Selecione ate <strong>{redrawsLeft}</strong> carta(s) para trocar.
          <span style={{ marginLeft: "6px", color: "#fcd34d", fontFamily: "monospace" }}>
            {selection.size}/{redrawsLeft}
          </span>
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          {hand.map((c) => {
            const selected = selection.has(c.handId);
            return (
              <button
                key={c.handId}
                onClick={() => onToggle(c.handId)}
                disabled={disabled}
                title={c.name + " - Poder " + c.power}
                style={{
                  aspectRatio: "2/3",
                  border: "2px solid " + (selected ? "#f59e0b" : c.faction.color + "88"),
                  borderRadius: "4px",
                  backgroundImage: c.frameUrl ? "url(" + c.frameUrl + ")" : c.imageUrl ? "url(" + c.imageUrl + ")" : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundColor: "#27272a",
                  opacity: selected ? 0.55 : 1,
                  cursor: disabled ? "not-allowed" : "pointer",
                  position: "relative",
                  boxShadow: selected ? "0 0 10px rgba(245, 158, 11, 0.7)" : "0 2px 4px rgba(0,0,0,0.5)",
                  transition: "all 0.15s",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "2px",
                    right: "2px",
                    background: "rgba(0,0,0,0.7)",
                    color: "#fcd34d",
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    fontSize: "10px",
                    padding: "1px 4px",
                    borderRadius: "2px",
                  }}
                >
                  {c.power}
                </span>
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)",
                    color: "#fafafa",
                    fontSize: "9px",
                    textAlign: "center",
                    padding: "1px 2px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            onClick={onSkip}
            disabled={disabled}
            style={{
              background: "#3f3f46",
              color: "#e4e4e7",
              border: "1px solid rgba(212, 160, 74, 0.3)",
              borderRadius: "4px",
              padding: "8px 16px",
              fontSize: "13px",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            Pular (nao trocar)
          </button>
          <button
            onClick={onConfirm}
            disabled={disabled || selection.size === 0}
            style={{
              background: "#d97706",
              color: "#1c1917",
              border: "none",
              borderRadius: "4px",
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: "bold",
              cursor: disabled || selection.size === 0 ? "not-allowed" : "pointer",
              opacity: disabled || selection.size === 0 ? 0.5 : 1,
            }}
          >
            Trocar {selection.size}
          </button>
        </div>
      </div>
    </div>
  );
}
function ControlButton({ onClick, disabled, color, children }: { onClick: () => void; disabled: boolean; color: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: color,
        color: "#e9d9b6",
        border: "1px solid rgba(212, 160, 74, 0.4)",
        borderRadius: "4px",
        padding: "4px 10px",
        fontSize: "11px",
        fontWeight: "bold",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
      }}
    >
      {children}
    </button>
  );
}

function CemTile({ entry, count, onClick }: { entry: { name: string; power: number; rarity: string; cardType: string; imageUrl: string | null; frameUrl: string | null; faction: { name: string; color: string }; ability: { name: string; description: string } | null } | null; count: number; onClick: () => void }) {
  if (!entry) {
    return <span style={{ color: "#52525b", fontSize: "10px", fontFamily: "monospace" }}>{count}</span>;
  }
  return (
    <div
      title={entry.name + " (descartada)"}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundImage: entry.frameUrl ? "url(" + entry.frameUrl + ")" : entry.imageUrl ? "url(" + entry.imageUrl + ")" : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#1a0f06",
        border: "1px solid #71717a",
        borderRadius: "2px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.6)",
        filter: "grayscale(0.4) brightness(0.85)",
      }}
    >
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, fontSize: "9px", fontFamily: "monospace", textAlign: "center", background: "rgba(0,0,0,0.85)", color: "#fcd34d", padding: "0 2px" }}>
        {count}
      </div>
    </div>
  );
}
function DeckBox({ count, factionColor }: { count: number; factionColor: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        border: "1px solid " + factionColor + "aa",
        borderRadius: "3px",
        backgroundImage: "linear-gradient(135deg, #3d2817 0%, #1a0f06 50%, #3d2817 100%)",
        boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: factionColor + "cc",
        textShadow: "0 0 6px " + factionColor + "88",
        fontSize: "20px",
      }}
    >
      <span>✦</span>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: "10px",
          fontFamily: "monospace",
          fontWeight: "bold",
          color: "#fde68a",
          background: "rgba(0,0,0,0.75)",
          padding: "1px 0",
        }}
      >
        {count}
      </div>
    </div>
  );
}
function LeaderTile({ p, side, turnSide, canAct, onActivate, onShiftClick, disabled }: { p: PlayerInfo; side: Side; turnSide: Side | null; canAct: boolean; onActivate: () => void; onShiftClick: () => void; disabled: boolean }) {
  const leader = p.deck.leader;
  if (!leader) {
    return <div style={{ color: "#888", fontSize: "10px" }}>Sem lider</div>;
  }
  const canActivate = canAct && side === turnSide && leader.leaderMode === "ACTIVE" && !p.leaderUsed && !disabled;
  const isTurn = side === turnSide;
  return (
    <CardTooltip fillContainer card={{
      name: leader.name,
      power: leader.power,
      rarity: leader.rarity,
      cardType: leader.cardType,
      imageUrl: leader.imageUrl,
      frameUrl: leader.frameUrl,
      faction: p.deck.faction,
      ability: leader.ability ? { name: leader.ability.name, description: leader.ability.description } : null,
    }}>
    <div
      onClick={(e) => { if (e.shiftKey) { e.stopPropagation(); onShiftClick(); } }}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundImage: leader.frameUrl
          ? "url(" + leader.frameUrl + ")"
          : leader.imageUrl
          ? "url(" + leader.imageUrl + ")"
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#1a0f06",
        border: isTurn ? "3px solid #fde047" : "2px solid " + p.deck.faction.color,
        borderRadius: "4px",
        boxShadow: isTurn ? "0 0 20px rgba(253, 224, 71, 0.8), 0 0 8px rgba(253, 224, 71, 0.6) inset" : "none",
        transition: "all 0.3s ease",
      }}
    >
      {canActivate && (
        <button
          onClick={onActivate}
          disabled={disabled}
          title={leader.ability?.description ?? "Ativar habilidade do lider"}
          style={{
            position: "absolute",
            bottom: "2px",
            left: "2px",
            right: "2px",
            background: "rgba(91, 33, 182, 0.92)",
            color: "#e9d4ff",
            border: "1px solid #a78bfa",
            borderRadius: "3px",
            padding: "2px 0",
            fontSize: "9px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 0 6px rgba(167, 139, 250, 0.6)",
          }}
        >
          ✦ Ativar
        </button>
      )}
      {p.leaderUsed && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fde047",
            fontSize: "9px",
            fontWeight: "bold",
            textAlign: "center",
            borderRadius: "2px",
          }}
        >
          USADO
        </div>
      )}
    </div>
    </CardTooltip>
  );
}

function PlayerScore({ p, side, turnSide, hasPassed, total }: { p: PlayerInfo; side: Side; turnSide: Side | null; hasPassed: boolean; total: number }) {
  const isTurn = side === turnSide;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
      <div style={{ fontSize: "10px", color: p.deck.faction.color, fontWeight: "bold", textShadow: isTurn ? "0 0 6px rgba(253, 224, 71, 0.8)" : "none" }}>
        {isTurn && <span style={{ color: "#fde047" }}>{"\u25B6 "}</span>}
        {p.username} ({side})
        {hasPassed && <span style={{ marginLeft: "4px", color: "#f87171" }}>{"· passou"}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px" }}>
        <div style={{ display: "flex", gap: "3px" }}>
          {[0, 1].map((i) => (
            <span
              key={i}
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: i < p.roundsWon ? "#fbbf24" : "#3f3f46",
                boxShadow: isTurn && i < p.roundsWon ? "0 0 4px rgba(251, 191, 36, 0.8)" : "none",
              }}
            />
          ))}
        </div>
        <div style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: "bold", color: "#fcd34d", textShadow: "0 0 6px rgba(253, 224, 71, 0.5), 0 1px 2px rgba(0,0,0,0.8)" }}>
          {total}
        </div>
      </div>
    </div>
  );
}