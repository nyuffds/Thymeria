// lib/match-engine.ts
// Lógica pura do motor de partida (sem I/O, sem Prisma).
// Funções de cálculo, helpers e validações reutilizáveis.

import type { EngineKey } from "./constants";

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────

export type Side = "A" | "B";
export type Row = "MELEE" | "RANGED" | "SIEGE";
export type Zone = "DECK" | "HAND" | "DISCARD";

export interface BoardCardState {
  id: string;          // MatchBoardCard.id
  cardId: string;      // Card.id
  side: Side;          // dono atual (pode ter virado por SPY)
  row: Row;
  basePower: number;
  power: number;       // poder atual com modificadores
  shielded: boolean;
  isToken: boolean;
}

export interface WeatherState {
  weatherKey: string;  // WEATHER_RAIN | WEATHER_FROST | WEATHER_FOG | WEATHER_STORM
  affectedRow: Row;
  cardId: string;
}

export interface ImmunityState {
  side: Side;
  row: Row;
  turnsLeft: number;
}

export interface CardDef {
  id: string;
  name: string;
  power: number;
  rows: string;        // CSV
  cardType: string;    // UNIT | SPECIAL | LEADER | WEATHER
  isElite: boolean;    // Elite: imune a todos efeitos
  leaderMode?: string | null;
  ability?: { engineKey: string | null; engineValue: number | null } | null;
}

// ─────────────────────────────────────────────
// Embaralhamento (Fisher-Yates determinístico se quiser semente)
// ─────────────────────────────────────────────

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─────────────────────────────────────────────
// Validação: a carta pode ser jogada em determinada fileira?
// ─────────────────────────────────────────────

export function cardAllowsRow(cardRows: string, row: Row): boolean {
  return cardRows.split(",").map((s) => s.trim()).includes(row);
}

// ─────────────────────────────────────────────
// Climas → fileiras afetadas
// ─────────────────────────────────────────────

export function weatherToRow(weatherKey: string): Row | null {
  // Compatibilidade: retorna a primeira fileira ou null.
  const rows = weatherToRows(weatherKey);
  return rows.length > 0 ? rows[0] : null;
}

export function weatherToRows(weatherKey: string): Row[] {
  switch (weatherKey) {
    case "WEATHER_FROST": return ["MELEE"];
    case "WEATHER_FOG":   return ["RANGED"];
    case "WEATHER_STORM": return ["SIEGE", "RANGED"];
    case "WEATHER_RAIN":  return ["SIEGE"];
    default: return [];
  }
}

// ─────────────────────────────────────────────
// Recalcula poder de TODAS as cartas no tabuleiro.
//
// Camadas de modificadores aplicadas em ordem:
//   1. basePower como ponto de partida
//   2. BOND: se há N cópias da mesma cardId na mesma fileira (mesmo lado),
//      cada uma recebe +bondValue * (N - 1)
//   3. Clima ativo na fileira: força poder = 1 (independente de boosts)
// Modificadores diretos como BOOST/DAMAGE/HEAL são aplicados pontualmente
// quando a habilidade é executada — eles MODIFICAM basePower diretamente
// (ex: BOOST persistente eleva basePower). Aqui só aplicamos efeitos de
// camada (clima + BOND).
// ─────────────────────────────────────────────

export function recomputePower(
  board: BoardCardState[],
  weather: WeatherState[],
  cardDefs: Map<string, CardDef>,
  immunities: ImmunityState[] = [],
): BoardCardState[] {
  // Set de fileiras imunes: chave "side|row"
  const immuneRows = new Set<string>();
  for (const i of immunities) {
    if (i.turnsLeft > 0) immuneRows.add(`${i.side}|${i.row}`);
  }
  // Fileiras afetadas por clima
  const weatheredRows = new Set<Row>();
  for (const w of weather) {
    weatheredRows.add(w.affectedRow);
  }

  // Agrupa por (side, row, cardId) pra contar BOND
  type Key = string;
  const groupCount = new Map<Key, number>();
  function k(side: Side, row: Row, cardId: string): Key {
    return `${side}|${row}|${cardId}`;
  }

  for (const c of board) {
    const def = cardDefs.get(c.cardId);
    if (!def) continue;
    if (def.ability?.engineKey === "BOND") {
      const key = k(c.side, c.row, c.cardId);
      groupCount.set(key, (groupCount.get(key) ?? 0) + 1);
    }
  }

  return board.map((c) => {
    // ELITE: cartas Elite sao imunes a TUDO (clima, BOND, boost, dano).
    // Mantemos power = basePower fixo.
    const elDef = cardDefs.get(c.cardId);
    if (elDef?.isElite) {
      return { ...c, power: c.basePower };
    }
    if (immuneRows.has(`${c.side}|${c.row}`)) {
      return { ...c, power: c.basePower };
    }
    if (weatheredRows.has(c.row)) {
      return { ...c, power: 1 };
    }

    let power = c.basePower;
    const def = cardDefs.get(c.cardId);
    if (def?.ability?.engineKey === "BOND" && def.ability.engineValue) {
      const key = k(c.side, c.row, c.cardId);
      const count = groupCount.get(key) ?? 1;
      if (count > 1) {
        power += def.ability.engineValue * (count - 1);
      }
    }

    return { ...c, power };
  });
}

// ─────────────────────────────────────────────
// Poder total de um lado
// ─────────────────────────────────────────────

export function totalPower(board: BoardCardState[], side: Side): number {
  return board.filter((c) => c.side === side).reduce((sum, c) => sum + c.power, 0);
}

// ─────────────────────────────────────────────
// Decide vencedor da ronda baseado nos poderes finais
// ─────────────────────────────────────────────

export function decideRoundWinner(
  board: BoardCardState[],
  weather: WeatherState[],
  cardDefs: Map<string, CardDef>,
  immunities: ImmunityState[] = [],
): { winner: Side | "DRAW"; powerA: number; powerB: number } {
  const recomputed = recomputePower(board, weather, cardDefs, immunities);
  const powerA = totalPower(recomputed, "A");
  const powerB = totalPower(recomputed, "B");
  if (powerA > powerB) return { winner: "A", powerA, powerB };
  if (powerB > powerA) return { winner: "B", powerA, powerB };
  return { winner: "DRAW", powerA, powerB };
}

// ─────────────────────────────────────────────
// Quantos redraws na ronda N (Gwent clássico adaptado)
// ─────────────────────────────────────────────

export function redrawsForRound(round: number): number {
  if (round === 1) return 3;
  if (round === 2) return 2;
  return 1;
}

// ─────────────────────────────────────────────
// Determina qual lado começa a próxima ronda.
// Gwent clássico: quem perdeu a anterior. Em empate: mantém quem começou.
// ─────────────────────────────────────────────

export function nextStartingSide(
  previousStarter: Side,
  roundWinner: Side | "DRAW"
): Side {
  if (roundWinner === "DRAW") return previousStarter;
  return roundWinner === "A" ? "B" : "A";
}

// ─────────────────────────────────────────────
// Verifica se a partida acabou (alguém tem 2 vitórias)
// ─────────────────────────────────────────────

export function matchWinner(
  winsA: number,
  winsB: number
): Side | "DRAW" | null {
  if (winsA >= 2 && winsB >= 2) return "DRAW"; // só por completude
  if (winsA >= 2) return "A";
  if (winsB >= 2) return "B";
  return null;
}

// ─────────────────────────────────────────────
// Side oposto
// ─────────────────────────────────────────────

export function otherSide(s: Side): Side {
  return s === "A" ? "B" : "A";
}

// ─────────────────────────────────────────────
// Engine keys conhecidas pelo motor
// ─────────────────────────────────────────────

export const KNOWN_ENGINE_KEYS: ReadonlySet<EngineKey> = new Set([
  "BOOST", "DAMAGE", "SPAWN", "BOND", "SPY", "DRAW", "HEAL", "SHIELD",
  "WEATHER_RAIN", "WEATHER_FROST", "WEATHER_FOG", "WEATHER_STORM", "CLEAR_WEATHER", "PULL_BY_NAME",
  "BOOST_ROW", "BOOST_MANY", "DAMAGE_IF", "MULTIPLY_ROW", "DESTROY_ROW", "DESTROY_AND_DRAW",
  "TUTOR_BY_TYPE", "REVIVE_RANDOM", "REVIVE_TO_HAND", "SHUFFLE_AND_DRAW", "PROPHECY",
  "EVOLVE_FACTION", "IMMUNE_ROW", "ON_DEATH_SPAWN",
  "PERMANENCE", "PUNISHMENT", "BLOOD_MOON",
  "RETURN_TO_HAND", "RESURRECT_FROM_DISCARD", "SUMMON_FROM_DECK",
  "REVENGE", "CONSUME_ALLY", "SUMMON_TO_HAND_BY_NAME", "SUMMON_TO_BOARD_BY_NAME","HEAL_ROW", "DAMAGE_BY_ENEMY_ROW", "DRAW_DISCARD_OPP", "SACRIFICE_DRAW",
  "SUMMON_COPY", "ROW_SWAP", "STEAL_BUFF",]);