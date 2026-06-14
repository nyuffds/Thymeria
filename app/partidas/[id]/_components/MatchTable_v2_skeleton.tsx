"use client";
import { MatchEventLog } from "./MatchEventLog";

type Side = "A" | "B";
type Row = "MELEE" | "RANGED" | "SIEGE";

interface PlayerInfo {
  username: string;
  roundsWon: number;
  hasPassed: boolean;
  leaderUsed: boolean;
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

export function MatchTableV2Skeleton(props: Props) {
  const pA = props.players.A;
  const pB = props.players.B;

  const isOnline = props.mode === "ONLINE";
  const displaySide: Side | null = isOnline ? props.viewerSide : props.currentTurnSide;
  const hand: HandCard[] = displaySide ? props.hands[displaySide] : [];

  function cardsOn(side: Side, row: Row): BoardCard[] {
    return props.board.filter((b) => b.side === side && b.row === row);
  }
  function rowTotal(side: Side, row: Row): number {
    return cardsOn(side, row).reduce((s, c) => s + c.power, 0);
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
          <LeaderTile p={pA} />
        </Region>
        <Region pos={{ top: "30.6%", left: "3.1%", width: "5.8%", height: "14.2%" }}><DeckBox count={pA.deckRealCount} factionColor={pA.deck.faction.color} /></Region>
        <Region pos={{ top: "34%", left: "10.9%", width: "4%", height: "4.5%" }} label={pA.deckRealCount.toString()} />
        <Region pos={{ top: "43.5%", left: "13%", width: "2%", height: "4.5%" }} label={pA.discardCount.toString()} />

        <Region pos={{ top: "58.6%", left: "6.1%", width: "9.7%", height: "17%" }}>
          <LeaderTile p={pB} />
        </Region>
        <Region pos={{ top: "80.2%", left: "3.1%", width: "5.7%", height: "13.8%" }}><DeckBox count={pB.deckRealCount} factionColor={pB.deck.faction.color} /></Region>
        <Region pos={{ top: "83.5%", left: "10.9%", width: "4%", height: "4.5%" }} label={pB.deckRealCount.toString()} />
        <Region pos={{ top: "93%", left: "13%", width: "1.8%", height: "4%" }} label={pB.discardCount.toString()} />

        <Region pos={{ top: "20%", left: "22.6%", width: "4%", height: "4%" }} label={rowTotal("A", "SIEGE").toString()} />
        <Region pos={{ top: "40.5%", left: "22.6%", width: "4%", height: "4%" }} label={rowTotal("A", "RANGED").toString()} />
        <Region pos={{ top: "61.5%", left: "22.6%", width: "4%", height: "4%" }} label={rowTotal("A", "MELEE").toString()} />

        <Region pos={{ top: "9.5%", left: "27.5%", width: "23%", height: "21%" }}>
          <CardLane cards={cardsOn("A", "SIEGE")} />
        </Region>
        <Region pos={{ top: "9.5%", left: "52.8%", width: "22.4%", height: "21%" }}>
          <CardLane cards={cardsOn("B", "SIEGE")} />
        </Region>
        <Region pos={{ top: "31%", left: "27.5%", width: "23%", height: "21%" }}>
          <CardLane cards={cardsOn("A", "RANGED")} />
        </Region>
        <Region pos={{ top: "31%", left: "52.8%", width: "22.4%", height: "21%" }}>
          <CardLane cards={cardsOn("B", "RANGED")} />
        </Region>
        <Region pos={{ top: "52.5%", left: "27.5%", width: "23%", height: "21%" }}>
          <CardLane cards={cardsOn("A", "MELEE")} />
        </Region>
        <Region pos={{ top: "52.5%", left: "52.8%", width: "22.4%", height: "21%" }}>
          <CardLane cards={cardsOn("B", "MELEE")} />
        </Region>

        <Region pos={{ top: "20%", left: "75.3%", width: "4%", height: "4%" }} label={rowTotal("B", "SIEGE").toString()} />
        <Region pos={{ top: "40.5%", left: "75.3%", width: "4%", height: "4%" }} label={rowTotal("B", "RANGED").toString()} />
        <Region pos={{ top: "61.5%", left: "75.3%", width: "4%", height: "4%" }} label={rowTotal("B", "MELEE").toString()} />

        <Region pos={{ top: "77.2%", left: "21.3%", width: "59.3%", height: "19.5%" }}>
          <HandLane cards={hand} />
        </Region>

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
}: {
  pos: { top: string; left: string; width: string; height: string };
  label?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        height: pos.height,
        border: "1px dashed rgba(255, 80, 80, 0.4)",
        background: "rgba(0, 0, 0, 0.15)",
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

function CardLane({ cards }: { cards: BoardCard[] }) {
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
        <MiniCard key={c.boardId} c={c} />
      ))}
    </div>
  );
}

function HandLane({ cards }: { cards: HandCard[] }) {
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
        <HandCardTile key={c.handId} c={c} />
      ))}
    </div>
  );
}

function HandCardTile({ c }: { c: HandCard }) {
  return (
    <div
      title={c.name + " - Poder " + c.power}
      style={{
        flexShrink: 0,
        width: "62px",
        height: "93px",
        borderRadius: "4px",
        border: "2px solid " + (c.isElite ? "#fbbf24" : c.faction.color),
        backgroundImage: c.frameUrl
          ? "url(" + c.frameUrl + ")"
          : c.imageUrl
          ? "url(" + c.imageUrl + ")"
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#1a0f06",
        position: "relative",
        boxShadow: c.isElite ? "0 0 8px rgba(251, 191, 36, 0.7)" : "0 2px 4px rgba(0,0,0,0.6)",
        cursor: "pointer",
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

function MiniCard({ c }: { c: BoardCard }) {
  return (
    <div
      title={c.name + " - Poder " + c.power}
      style={{
        flexShrink: 0,
        width: "44px",
        height: "66px",
        borderRadius: "3px",
        border: "1.5px solid " + (c.isElite ? "#fbbf24" : c.faction.color),
        backgroundImage: c.frameUrl
          ? "url(" + c.frameUrl + ")"
          : c.imageUrl
          ? "url(" + c.imageUrl + ")"
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#1a0f06",
        position: "relative",
        boxShadow: c.isElite ? "0 0 6px rgba(251, 191, 36, 0.7)" : "0 1px 3px rgba(0,0,0,0.6)",
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
function LeaderTile({ p }: { p: PlayerInfo }) {
  const leader = p.deck.leader;
  if (!leader) {
    return <div style={{ color: "#888", fontSize: "10px" }}>Sem lider</div>;
  }
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
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
    />
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