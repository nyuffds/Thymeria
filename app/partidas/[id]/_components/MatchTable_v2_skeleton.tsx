"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { passRoundAction, abandonMatchAction, pauseMatchAction, resumeMatchAction, offerDrawAction, activateLeaderAction, redrawAction, skipRedrawAction, playCardAction } from "@/lib/match-actions";
import { MatchEventLog } from "./MatchEventLog";

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
  ability: { name: string; description: string; engineKey: string | null; engineValue: number | null } | null;
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
}

const NEEDS_TARGET = new Set(["BOOST", "DAMAGE", "HEAL", "DAMAGE_IF", "DESTROY_AND_DRAW", "EVOLVE_FACTION"]);
const NEEDS_ROW_TARGET = new Set(["BOOST_ROW", "MULTIPLY_ROW", "DESTROY_ROW", "IMMUNE_ROW", "WEATHER_RAIN"]);

export function MatchTableV2Skeleton(props: Props) {
  const pA = props.players.A;
  const pB = props.players.B;

  const [selectedHandCard, setSelectedHandCard] = useState<HandCard | null>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function guard(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try { await fn(); router.refresh(); }
      catch (err) { setError(err instanceof Error ? err.message : "Erro."); }
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

  // Estado de redraw
  const [redrawSelection, setRedrawSelection] = useState<Set<string>>(new Set());

  function toggleRedraw(handId: string) {
    if (!props.currentTurnSide) return;
    const player = props.players[props.currentTurnSide];
    setRedrawSelection((prev) => {
      const next = new Set(prev);
      if (next.has(handId)) next.delete(handId);
      else if (next.size < player.redrawsLeft) next.add(handId);
      return next;
    });
  }
  function confirmRedraw() {
    if (!props.currentTurnSide) return;
    const ids = Array.from(redrawSelection);
    guard(async () => {
      await redrawAction(props.matchId, props.currentTurnSide!, ids);
      setRedrawSelection(new Set());
    });
  }
  function skipRedraw() {
    if (!props.currentTurnSide) return;
    guard(async () => {
      await skipRedrawAction(props.matchId, props.currentTurnSide!);
      setRedrawSelection(new Set());
    });
  }

  // Estado de ativacao do lider
  const [activatingLeader, setActivatingLeader] = useState<Side | null>(null);
  const [leaderTargetMode, setLeaderTargetMode] = useState<"NONE" | "ALLY" | "ENEMY" | "ROW_ALLY" | "ROW_ENEMY">("NONE");
  const [chosenRow, setChosenRow] = useState<Row | null>(null);
  const turnSide = props.currentTurnSide;

  function handleActivateLeader() {
    if (!turnSide) return;
    const leader = props.players[turnSide].deck.leader;
    if (!leader || leader.leaderMode !== "ACTIVE" || props.players[turnSide].leaderUsed) return;
    const ek = leader.ability?.engineKey ?? null;
    if (ek && NEEDS_TARGET.has(ek)) {
      setActivatingLeader(turnSide);
      setLeaderTargetMode((ek === "BOOST" || ek === "HEAL" || ek === "EVOLVE_FACTION") ? "ALLY" : "ENEMY");
    } else if (ek && NEEDS_ROW_TARGET.has(ek)) {
      setActivatingLeader(turnSide);
      setLeaderTargetMode((ek === "DESTROY_ROW" || ek === "WEATHER_RAIN") ? "ROW_ENEMY" : "ROW_ALLY");
    } else {
      guard(async () => {
        await activateLeaderAction({ matchId: props.matchId, side: turnSide });
      });
    }
  }

  function handleLeaderRowSelect(row: Row) {
    if (!activatingLeader) return;
    const side = activatingLeader;
    guard(async () => {
      await activateLeaderAction({ matchId: props.matchId, side, targetRow: row });
      setActivatingLeader(null);
      setLeaderTargetMode("NONE");
    });
  }

  function handleLeaderTargetClick(target: BoardCard) {
    if (!activatingLeader) return;
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
    if (!selectedHandCard) return;
    const ek = selectedHandCard.ability?.engineKey ?? null;
    // Por enquanto: so jogadas SIMPLES (sem alvo) funcionam
    if (ek && (NEEDS_TARGET.has(ek) || NEEDS_ROW_TARGET.has(ek))) {
      setError("Habilidades com alvo ainda nao implementadas no v2.");
      return;
    }
    setChosenRow(row);
    guard(async () => {
      await playCardAction({
        matchId: props.matchId,
        side: turnSide!,
        handCardId: selectedHandCard.handId,
        targetRow: row,
      });
      setSelectedHandCard(null);
      setChosenRow(null);
    });
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

  function handleSelectHandCard(card: HandCard) {
    if (props.status !== "PLAYING") return;
    if (selectedHandCard?.handId === card.handId) {
      setSelectedHandCard(null);
    } else {
      setSelectedHandCard(card);
    }
  }

  const isOnline = props.mode === "ONLINE";
  const displaySide: Side | null = isOnline ? props.viewerSide : props.currentTurnSide;
  const hand: HandCard[] = displaySide ? props.hands[displaySide] : [];

  function cardsOn(side: Side, row: Row): BoardCard[] {
    return props.board.filter((b) => b.side === side && b.row === row);
  }
  function rowTotal(side: Side, row: Row): number {
    return cardsOn(side, row).reduce((s, c) => s + c.power, 0);
  }

    function isCardTargetable(c: BoardCard): boolean {
    if (!activatingLeader) return false;
    if (leaderTargetMode === "ALLY") return c.side === activatingLeader && !c.isElite;
    if (leaderTargetMode === "ENEMY") return c.side !== activatingLeader && !c.isElite;
    return false;
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "20px", background: "#0c0a08", minHeight: "100vh" }}>
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
          <PlayerScore p={pA} side="A" />
        </Region>
        <Region pos={{ top: "2.8%", left: "60%", width: "9.7%", height: "5.5%" }}>
          <PlayerScore p={pB} side="B" />
        </Region>

        <Region pos={{ top: "8.5%", left: "6.1%", width: "9.8%", height: "17%" }}>
          <LeaderTile p={pA} side="A" turnSide={turnSide} onActivate={handleActivateLeader} disabled={isPending} />
        </Region>
        <Region pos={{ top: "30.6%", left: "3.1%", width: "5.8%", height: "14.2%" }}><DeckBox count={pA.deckRealCount} factionColor={pA.deck.faction.color} /></Region>
        <Region pos={{ top: "34%", left: "10.9%", width: "4%", height: "4.5%" }} label={pA.deckRealCount.toString()} />
        <Region pos={{ top: "43.5%", left: "13%", width: "2%", height: "4.5%" }} label={pA.discardCount.toString()} />

        <Region pos={{ top: "58.6%", left: "6.1%", width: "9.7%", height: "17%" }}>
          <LeaderTile p={pB} side="B" turnSide={turnSide} onActivate={handleActivateLeader} disabled={isPending} />
        </Region>
        <Region pos={{ top: "80.2%", left: "3.1%", width: "5.7%", height: "13.8%" }}><DeckBox count={pB.deckRealCount} factionColor={pB.deck.faction.color} /></Region>
        <Region pos={{ top: "83.5%", left: "10.9%", width: "4%", height: "4.5%" }} label={pB.deckRealCount.toString()} />
        <Region pos={{ top: "93%", left: "13%", width: "1.8%", height: "4%" }} label={pB.discardCount.toString()} />

        <Region pos={{ top: "20%", left: "22.6%", width: "4%", height: "4%" }} label={rowTotal("A", "SIEGE").toString()} />
        <Region pos={{ top: "40.5%", left: "22.6%", width: "4%", height: "4%" }} label={rowTotal("A", "RANGED").toString()} />
        <Region pos={{ top: "61.5%", left: "22.6%", width: "4%", height: "4%" }} label={rowTotal("A", "MELEE").toString()} />

        <Region pos={{ top: "9.5%", left: "27.5%", width: "23%", height: "21%" }} highlight={isRowAvailable("A", "SIEGE")} onClick={isRowAvailable("A", "SIEGE") ? () => handleChooseRow("SIEGE") : undefined}>
          <CardLane cards={cardsOn("A", "SIEGE")} isTargetable={isCardTargetable} onCardClick={handleLeaderTargetClick} />
        </Region>
        <Region pos={{ top: "9.5%", left: "52.8%", width: "22.4%", height: "21%" }} highlight={isRowAvailable("B", "SIEGE")} onClick={isRowAvailable("B", "SIEGE") ? () => handleChooseRow("SIEGE") : undefined}>
          <CardLane cards={cardsOn("B", "SIEGE")} isTargetable={isCardTargetable} onCardClick={handleLeaderTargetClick} />
        </Region>
        <Region pos={{ top: "31%", left: "27.5%", width: "23%", height: "21%" }} highlight={isRowAvailable("A", "RANGED")} onClick={isRowAvailable("A", "RANGED") ? () => handleChooseRow("RANGED") : undefined}>
          <CardLane cards={cardsOn("A", "RANGED")} isTargetable={isCardTargetable} onCardClick={handleLeaderTargetClick} />
        </Region>
        <Region pos={{ top: "31%", left: "52.8%", width: "22.4%", height: "21%" }} highlight={isRowAvailable("B", "RANGED")} onClick={isRowAvailable("B", "RANGED") ? () => handleChooseRow("RANGED") : undefined}>
          <CardLane cards={cardsOn("B", "RANGED")} isTargetable={isCardTargetable} onCardClick={handleLeaderTargetClick} />
        </Region>
        <Region pos={{ top: "52.5%", left: "27.5%", width: "23%", height: "21%" }} highlight={isRowAvailable("A", "MELEE")} onClick={isRowAvailable("A", "MELEE") ? () => handleChooseRow("MELEE") : undefined}>
          <CardLane cards={cardsOn("A", "MELEE")} isTargetable={isCardTargetable} onCardClick={handleLeaderTargetClick} />
        </Region>
        <Region pos={{ top: "52.5%", left: "52.8%", width: "22.4%", height: "21%" }} highlight={isRowAvailable("B", "MELEE")} onClick={isRowAvailable("B", "MELEE") ? () => handleChooseRow("MELEE") : undefined}>
          <CardLane cards={cardsOn("B", "MELEE")} isTargetable={isCardTargetable} onCardClick={handleLeaderTargetClick} />
        </Region>

        <Region pos={{ top: "20%", left: "75.3%", width: "4%", height: "4%" }} label={rowTotal("B", "SIEGE").toString()} />
        <Region pos={{ top: "40.5%", left: "75.3%", width: "4%", height: "4%" }} label={rowTotal("B", "RANGED").toString()} />
        <Region pos={{ top: "61.5%", left: "75.3%", width: "4%", height: "4%" }} label={rowTotal("B", "MELEE").toString()} />

        <Region pos={{ top: "77.2%", left: "21.3%", width: "59.3%", height: "19.5%" }}>
          <HandLane cards={hand} selectedHandId={selectedHandCard?.handId ?? null} onSelect={handleSelectHandCard} />
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

        {props.status === "REDRAW" && props.currentTurnSide && (
          <RedrawModal
            hand={props.hands[props.currentTurnSide]}
            redrawsLeft={props.players[props.currentTurnSide].redrawsLeft}
            selection={redrawSelection}
            onToggle={toggleRedraw}
            onConfirm={confirmRedraw}
            onSkip={skipRedraw}
            disabled={isPending}
            playerName={props.players[props.currentTurnSide].username}
          />
        )}
        <Region pos={{ top: "8.5%", left: "83.2%", width: "14.8%", height: "41%" }}><HistoryPanel events={props.currentRoundEvents} playerNames={{ A: pA.username, B: pB.username }} currentRound={props.round} /></Region>
        <Region pos={{ top: "59.5%", left: "83.2%", width: "14.8%", height: "36.5%" }}><WeatherPanel weather={props.weather} /></Region>
      </div>
    </div>
  );
}

function Region({
  pos,
  label,
  children,
  highlight,
  onClick,
}: {
  pos: { top: string; left: string; width: string; height: string };
  label?: string;
  children?: React.ReactNode;
  highlight?: boolean;
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
        border: highlight ? "2px solid #fde047" : "1px dashed rgba(255, 80, 80, 0.4)",
        background: highlight ? "rgba(253, 224, 71, 0.18)" : "rgba(0, 0, 0, 0.15)",
        boxShadow: highlight ? "0 0 16px rgba(253, 224, 71, 0.6) inset" : undefined,
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

function CardLane({ cards, isTargetable, onCardClick }: { cards: BoardCard[]; isTargetable: (c: BoardCard) => boolean; onCardClick: (c: BoardCard) => void }) {
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
        <MiniCard key={c.boardId} c={c} targetable={isTargetable(c)} onClick={() => onCardClick(c)} />
      ))}
    </div>
  );
}

function HandLane({ cards, selectedHandId, onSelect }: { cards: HandCard[]; selectedHandId: string | null; onSelect: (c: HandCard) => void }) {
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
        <HandCardTile key={c.handId} c={c} isSelected={selectedHandId === c.handId} onClick={() => onSelect(c)} />
      ))}
    </div>
  );
}

function HandCardTile({ c, isSelected, onClick }: { c: HandCard; isSelected: boolean; onClick: () => void }) {
  return (
    <div
      title={c.name + " - Poder " + c.power}
      onClick={onClick}
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
        boxShadow: isSelected ? "0 0 14px rgba(253, 224, 71, 0.9)" : (c.isElite ? "0 0 8px rgba(251, 191, 36, 0.7)" : "0 2px 4px rgba(0,0,0,0.6)"),
        cursor: "pointer",
        transform: isSelected ? "translateY(-6px) scale(1.06)" : "none",
        transition: "transform 0.15s, box-shadow 0.15s",
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
  );
}

function MiniCard({ c, targetable, onClick }: { c: BoardCard; targetable: boolean; onClick: () => void }) {
  return (
    <div
      title={c.name + " - Poder " + c.power}
      onClick={targetable ? onClick : undefined}
      style={{
        flexShrink: 0,
        width: "44px",
        height: "66px",
        borderRadius: "3px",
        border: "1.5px solid " + (targetable ? "#fde047" : (c.isElite ? "#fbbf24" : c.faction.color)),
        cursor: targetable ? "pointer" : "default",
        backgroundImage: c.frameUrl
          ? "url(" + c.frameUrl + ")"
          : c.imageUrl
          ? "url(" + c.imageUrl + ")"
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#1a0f06",
        position: "relative",
        boxShadow: targetable ? "0 0 8px rgba(253, 224, 71, 0.85)" : (c.isElite ? "0 0 6px rgba(251, 191, 36, 0.7)" : "0 1px 3px rgba(0,0,0,0.6)"),
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
function LeaderTile({ p, side, turnSide, onActivate, disabled }: { p: PlayerInfo; side: Side; turnSide: Side | null; onActivate: () => void; disabled: boolean }) {
  const leader = p.deck.leader;
  if (!leader) {
    return <div style={{ color: "#888", fontSize: "10px" }}>Sem lider</div>;
  }
  const canActivate = side === turnSide && leader.leaderMode === "ACTIVE" && !p.leaderUsed && !disabled;
  return (
    <div
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
        border: "2px solid " + p.deck.faction.color,
        borderRadius: "4px",
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
  );
}

function PlayerScore({ p, side }: { p: PlayerInfo; side: Side }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
      <div style={{ fontSize: "10px", color: p.deck.faction.color, fontWeight: "bold" }}>
        {p.username} ({side})
      </div>
      <div style={{ display: "flex", gap: "3px", marginTop: "2px" }}>
        {[0, 1].map((i) => (
          <span
            key={i}
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: i < p.roundsWon ? "#fbbf24" : "#3f3f46",
            }}
          />
        ))}
      </div>
    </div>
  );
}