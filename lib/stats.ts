// lib/stats.ts
// Helpers de estatistica usados em /lobby (leaderboard, head-to-head, cartas mais usadas)
// e /partidas (historico do jogador).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type LeaderboardEntry = {
  userId: string;
  username: string;
  wins: number;
  losses: number;
  draws: number;
  total: number;
  winRate: number; // 0-1
};

export type MatchHistoryEntry = {
  matchId: string;
  finishedAt: string;
  mode: string;
  opponentName: string;
  opponentFaction: string;
  opponentFactionColor: string;
  yourFaction: string;
  yourFactionColor: string;
  result: "WIN" | "LOSS" | "DRAW";
  yourSide: "A" | "B";
  roundsWon: { you: number; opponent: number };
  durationMs: number;
};

export type HeadToHead = {
  totalMatches: number;
  winsA: number;
  winsB: number;
  draws: number;
};

// ─── LEADERBOARD ──────────────────────────────────────
export async function getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  // Pega todos os MatchPlayer de partidas FINISHED
  const players = await prisma.matchPlayer.findMany({
    where: { match: { status: "FINISHED" } },
    include: {
      match: { select: { winnerSide: true } },
      user: { select: { id: true, username: true } },
    },
  });

  type Stats = { userId: string; username: string; w: number; l: number; d: number };
  const map = new Map<string, Stats>();

  for (const p of players) {
    if (!map.has(p.userId)) {
      map.set(p.userId, { userId: p.userId, username: p.user.username, w: 0, l: 0, d: 0 });
    }
    const s = map.get(p.userId)!;
    if (p.match.winnerSide === "DRAW") s.d++;
    else if (p.match.winnerSide === p.side) s.w++;
    else s.l++;
  }

  const arr: LeaderboardEntry[] = Array.from(map.values()).map((s) => {
    const total = s.w + s.l + s.d;
    return {
      userId: s.userId,
      username: s.username,
      wins: s.w,
      losses: s.l,
      draws: s.d,
      total,
      winRate: total > 0 ? s.w / total : 0,
    };
  });

  arr.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return a.username.localeCompare(b.username);
  });

  return arr.slice(0, limit);
}

// ─── HEAD-TO-HEAD ──────────────────────────────────────
export async function getHeadToHead(userIdA: string, userIdB: string): Promise<HeadToHead> {
  // Procura todas as partidas FINISHED onde ambos sao players
  const matches = await prisma.match.findMany({
    where: {
      status: "FINISHED",
      AND: [
        { players: { some: { userId: userIdA } } },
        { players: { some: { userId: userIdB } } },
      ],
    },
    include: { players: true },
  });

  let winsA = 0;
  let winsB = 0;
  let draws = 0;

  for (const m of matches) {
    if (m.winnerSide === "DRAW") {
      draws++;
      continue;
    }
    const winnerPlayer = m.players.find((p) => p.side === m.winnerSide);
    if (!winnerPlayer) continue;
    if (winnerPlayer.userId === userIdA) winsA++;
    else if (winnerPlayer.userId === userIdB) winsB++;
  }

  return { totalMatches: matches.length, winsA, winsB, draws };
}

// ─── CARTAS MAIS USADAS ──────────────────────────────────────
export type TopCard = {
  cardId: string;
  name: string;
  imageUrl: string | null;
  rarity: string;
  factionName: string;
  factionColor: string;
  usageCount: number;
  winCount: number;
  winRate: number;
};

export async function getMostUsedCards(limit = 10): Promise<TopCard[]> {
  // Conta cartas jogadas (zone=BOARD ou DISCARD) em partidas FINISHED
  // e correlaciona com vitorias
  const hands = await prisma.matchHand.findMany({
    where: {
      zone: { in: ["BOARD", "DISCARD"] },
      match: { status: "FINISHED" },
    },
    include: {
      card: { include: { faction: true } },
      match: { select: { winnerSide: true } },
    },
  });

  type Stats = { cardId: string; name: string; imageUrl: string | null; rarity: string; factionName: string; factionColor: string; usage: number; wins: number };
  const map = new Map<string, Stats>();

  for (const h of hands) {
    if (!map.has(h.cardId)) {
      map.set(h.cardId, {
        cardId: h.cardId,
        name: h.card.name,
        imageUrl: h.card.imageUrl,
        rarity: h.card.rarity,
        factionName: h.card.faction.name,
        factionColor: h.card.faction.color,
        usage: 0,
        wins: 0,
      });
    }
    const s = map.get(h.cardId)!;
    s.usage++;
    if (h.match.winnerSide === h.side) s.wins++;
  }

  const arr: TopCard[] = Array.from(map.values()).map((s) => ({
    cardId: s.cardId,
    name: s.name,
    imageUrl: s.imageUrl,
    rarity: s.rarity,
    factionName: s.factionName,
    factionColor: s.factionColor,
    usageCount: s.usage,
    winCount: s.wins,
    winRate: s.usage > 0 ? s.wins / s.usage : 0,
  }));

  arr.sort((a, b) => b.usageCount - a.usageCount);

  return arr.slice(0, limit);
}

// ─── HISTORICO DO USUARIO ──────────────────────────────────────
export async function getUserMatchHistory(userId: string, limit = 30): Promise<MatchHistoryEntry[]> {
  const playerEntries = await prisma.matchPlayer.findMany({
    where: { userId, match: { status: "FINISHED" } },
    include: {
      match: {
        include: {
          players: {
            include: {
              user: { select: { username: true } },
              deck: { include: { faction: true } },
            },
          },
        },
      },
      deck: { include: { faction: true } },
    },
    orderBy: { match: { finishedAt: "desc" } },
    take: limit,
  });

  const result: MatchHistoryEntry[] = [];
  for (const p of playerEntries) {
    const opponent = p.match.players.find((o) => o.userId !== userId);
    if (!opponent) continue;
    let res: "WIN" | "LOSS" | "DRAW";
    if (p.match.winnerSide === "DRAW") res = "DRAW";
    else if (p.match.winnerSide === p.side) res = "WIN";
    else res = "LOSS";

    const finishedAt = p.match.finishedAt ?? p.match.createdAt;
    const startedAt = p.match.createdAt;
    const durationMs = finishedAt.getTime() - startedAt.getTime();

    result.push({
      matchId: p.match.id,
      finishedAt: finishedAt.toISOString(),
      mode: p.match.mode,
      opponentName: opponent.user.username,
      opponentFaction: opponent.deck.faction.name,
      opponentFactionColor: opponent.deck.faction.color,
      yourFaction: p.deck.faction.name,
      yourFactionColor: p.deck.faction.color,
      result: res,
      yourSide: p.side as "A" | "B",
      roundsWon: { you: p.roundsWon, opponent: opponent.roundsWon },
      durationMs,
    });
  }

  return result;
}