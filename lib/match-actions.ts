// lib/match-actions.ts
// Server actions de partida (HOTSEAT).

"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  type Side, type Row, type BoardCardState, type WeatherState, type CardDef,
  shuffle, cardAllowsRow, recomputePower, decideRoundWinner,
  redrawsForRound, nextStartingSide, matchWinner, otherSide, weatherToRow,
} from "./match-engine";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// HELPERS internos (não exportados como server action)
// ─────────────────────────────────────────────

async function loadMatchState(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      players: true,
      hands:   { include: { card: true } },
      board:   { include: { card: { include: { ability: true } } } },
      weather: { include: { card: true } },
    },
  });
  if (!match) throw new Error("Partida não encontrada.");
  return match;
}

async function buildCardDefs(cardIds: string[]): Promise<Map<string, CardDef>> {
  const cards = await prisma.card.findMany({
    where: { id: { in: cardIds } },
    include: { ability: true },
  });
  const map = new Map<string, CardDef>();
  for (const c of cards) {
    map.set(c.id, {
      id: c.id,
      name: c.name,
      power: c.power,
      rows: c.rows,
      cardType: c.cardType,
      leaderMode: c.leaderMode,
      ability: c.ability
        ? { engineKey: c.ability.engineKey, engineValue: c.ability.engineValue }
        : null,
    });
  }
  return map;
}

async function logEvent(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  matchId: string,
  round: number,
  side: Side | null,
  type: string,
  payload: Record<string, unknown>,
) {
  await tx.matchEvent.create({
    data: { matchId, round, side, type, payload: JSON.stringify(payload) },
  });
}

function mapBoardToState(b: { id: string; cardId: string; side: string; row: string; basePower: number; power: number; shielded: boolean; isToken: boolean }[]): BoardCardState[] {
  return b.map((x) => ({
    id: x.id,
    cardId: x.cardId,
    side: x.side as Side,
    row: x.row as Row,
    basePower: x.basePower,
    power: x.power,
    shielded: x.shielded,
    isToken: x.isToken,
  }));
}

function mapWeatherToState(w: { weatherKey: string; affectedRow: string; cardId: string }[]): WeatherState[] {
  return w.map((x) => ({
    weatherKey: x.weatherKey,
    affectedRow: x.affectedRow as Row,
    cardId: x.cardId,
  }));
}

// Recalcula e PERSISTE o poder de todas as cartas no tabuleiro
async function persistRecomputedPower(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  matchId: string,
) {
  const board = await tx.matchBoardCard.findMany({ where: { matchId } });
  const weather = await tx.matchWeather.findMany({ where: { matchId } });
  const cardDefs = await buildCardDefs(board.map((b) => b.cardId));

  const recomputed = recomputePower(mapBoardToState(board), mapWeatherToState(weather), cardDefs);
  for (const c of recomputed) {
    await tx.matchBoardCard.update({
      where: { id: c.id },
      data:  { power: c.power },
    });
  }
}

// ─────────────────────────────────────────────
// 1. CRIAR PARTIDA (HOTSEAT)
// ─────────────────────────────────────────────

export async function createHotseatMatchAction(data: {
  deckIdA: string;
  deckIdB: string;
}): Promise<{ matchId: string }> {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Você precisa estar logado.");

  if (data.deckIdA === data.deckIdB) {
    throw new Error("Os dois lados devem usar decks diferentes.");
  }

  const [deckA, deckB] = await Promise.all([
    prisma.deck.findUnique({
      where: { id: data.deckIdA },
      include: { user: true, leader: true, cards: true },
    }),
    prisma.deck.findUnique({
      where: { id: data.deckIdB },
      include: { user: true, leader: true, cards: true },
    }),
  ]);
  if (!deckA || !deckB) throw new Error("Deck não encontrado.");

  const settings = await prisma.gameSettings.upsert({
    where: { id: "singleton" }, update: {}, create: { id: "singleton" },
  });

  for (const [label, d] of [["A", deckA], ["B", deckB]] as const) {
    if (d.cards.length < settings.minCardsPerDeck) {
      throw new Error(`Deck ${label} tem só ${d.cards.length} cartas (mín ${settings.minCardsPerDeck}).`);
    }
    if (d.cards.length > settings.maxCardsPerDeck) {
      throw new Error(`Deck ${label} tem ${d.cards.length} cartas (máx ${settings.maxCardsPerDeck}).`);
    }
  }

  // Sorteia quem começa
  const startSide: Side = Math.random() < 0.5 ? "A" : "B";

  const result = await prisma.$transaction(async (tx) => {
    const match = await tx.match.create({
      data: {
        mode: "HOTSEAT",
        status: "REDRAW",
        currentRound: 1,
        currentTurnSide: startSide,
        startsRoundSide: startSide,
      },
    });

    for (const [side, d] of [["A", deckA], ["B", deckB]] as const) {
      await tx.matchPlayer.create({
        data: {
          matchId: match.id,
          side,
          userId: d.userId,
          deckId: d.id,
          redrawsLeft: redrawsForRound(1),
          deckCardCount: d.cards.length,
        },
      });

      // Embaralha e distribui 10 cartas (HAND) + resto fica no DECK
      const shuffled = shuffle(d.cards);
      for (let i = 0; i < shuffled.length; i++) {
        const zone = i < 10 ? "HAND" : "DECK";
        await tx.matchHand.create({
          data: {
            matchId: match.id,
            side,
            cardId: shuffled[i].cardId,
            zone,
            deckOrder: i,
          },
        });
      }

      // Líder PERSISTENT vai pra mesa imediatamente
      if (d.leader) {
        const leaderCard = await tx.card.findUnique({ where: { id: d.leader.cardId } });
        if (leaderCard && leaderCard.leaderMode === "PERSISTENT") {
          const rows = leaderCard.rows.split(",").filter(Boolean);
          const targetRow = (rows[0] ?? "MELEE") as Row;
          await tx.matchBoardCard.create({
            data: {
              matchId: match.id,
              side,
              cardId: leaderCard.id,
              row: targetRow,
              basePower: leaderCard.power,
              power: leaderCard.power,
              isToken: false,
            },
          });
        }
      }
    }

    await logEvent(tx, match.id, 1, null, "MATCH_CREATED", { startSide });
    return match;
  });

  revalidatePath("/partidas");
  revalidatePath(`/partidas/${result.id}`);
  return { matchId: result.id };
}

// ─────────────────────────────────────────────
// 2. REDRAW
// ─────────────────────────────────────────────

export async function redrawAction(matchId: string, side: Side, cardHandIds: string[]) {
  if (cardHandIds.length === 0) throw new Error("Selecione cartas pra trocar.");

  await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({ where: { id: matchId } });
    if (!match) throw new Error("Partida não encontrada.");
    if (match.status !== "REDRAW") throw new Error("Não é hora de redraw.");
    if (match.currentTurnSide !== side) throw new Error("Não é sua vez de redraw.");

    const player = await tx.matchPlayer.findUnique({
      where: { matchId_side: { matchId, side } },
    });
    if (!player) throw new Error("Lado inválido.");
    if (player.redrawsLeft === 0) throw new Error("Você já fez seu redraw.");
    if (cardHandIds.length > player.redrawsLeft) {
      throw new Error(`Você só pode trocar até ${player.redrawsLeft} carta(s) agora.`);
    }

    const entries = await tx.matchHand.findMany({
      where: { matchId, side, zone: "HAND", id: { in: cardHandIds } },
    });
    if (entries.length !== cardHandIds.length) {
      throw new Error("Algumas cartas selecionadas não estão na sua mão.");
    }

    const newCards = await tx.matchHand.findMany({
      where: { matchId, side, zone: "DECK" },
      orderBy: { deckOrder: "asc" },
      take: cardHandIds.length,
    });
    if (newCards.length < cardHandIds.length) {
      throw new Error("Não há cartas suficientes no deck pra fazer redraw.");
    }

    const maxOrder = await tx.matchHand.aggregate({
      where: { matchId, side },
      _max: { deckOrder: true },
    });
    let nextOrder = (maxOrder._max.deckOrder ?? 0) + 1;

    for (const e of entries) {
      await tx.matchHand.update({
        where: { id: e.id },
        data:  { zone: "DECK", deckOrder: nextOrder++ },
      });
    }

    for (const n of newCards) {
      await tx.matchHand.update({
        where: { id: n.id },
        data:  { zone: "HAND" },
      });
    }

    await tx.matchPlayer.update({
      where: { id: player.id },
      data:  { redrawsLeft: 0 },
    });

    await logEvent(tx, matchId, match.currentRound, side, "REDRAW",
      { count: cardHandIds.length });

    // Verifica se o outro lado também já fez seu redraw
    const opponent = await tx.matchPlayer.findUnique({
      where: { matchId_side: { matchId, side: otherSide(side) } },
    });

    if (opponent && opponent.redrawsLeft === 0) {
      // Ambos terminaram: vai pra PLAYING.
      // Quem começa é quem foi sorteado / quem perdeu a ronda anterior (startsRoundSide).
      await tx.match.update({
        where: { id: matchId },
        data:  {
          status: "PLAYING",
          currentTurnSide: match.startsRoundSide,
        },
      });
      await logEvent(tx, matchId, match.currentRound, null, "ROUND_START",
        { round: match.currentRound });
    } else {
      // Passa a vez do redraw pro outro lado
      await tx.match.update({
        where: { id: matchId },
        data:  { currentTurnSide: otherSide(side) },
      });
    }
  });

  revalidatePath(`/partidas/${matchId}`);
}

// ─────────────────────────────────────────────
// 3. JOGAR CARTA
// ─────────────────────────────────────────────

export async function playCardAction(data: {
  matchId: string;
  side: Side;
  handCardId: string;     // MatchHand.id
  targetRow: Row;
  targetBoardCardId?: string;  // alvo (BOOST, DAMAGE, HEAL, etc)
}) {
  await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({ where: { id: data.matchId } });
    if (!match) throw new Error("Partida não encontrada.");
    if (match.status !== "PLAYING") throw new Error("Não é hora de jogar.");
    if (match.currentTurnSide !== data.side) throw new Error("Não é seu turno.");

    const player = await tx.matchPlayer.findUnique({
      where: { matchId_side: { matchId: data.matchId, side: data.side } },
    });
    if (!player) throw new Error("Lado inválido.");
    if (player.hasPassed) throw new Error("Você já passou nesta ronda.");

    const handEntry = await tx.matchHand.findUnique({
      where: { id: data.handCardId },
      include: { card: { include: { ability: true } } },
    });
    if (!handEntry) throw new Error("Carta não está na mão.");
    if (handEntry.matchId !== data.matchId || handEntry.side !== data.side || handEntry.zone !== "HAND") {
      throw new Error("Carta inválida.");
    }

    const card = handEntry.card;

    // ── Cartas de CLIMA ──
    if (card.cardType === "WEATHER") {
      const engineKey = card.ability?.engineKey;
      if (!engineKey) throw new Error("Carta de clima sem habilidade configurada.");

      if (engineKey === "CLEAR_WEATHER") {
        await tx.matchWeather.deleteMany({ where: { matchId: data.matchId } });
      } else {
        // Determina fileira: WEATHER_RAIN usa targetRow; outros usam fixa
        const fixedRow = weatherToRow(engineKey);
        const affectedRow = fixedRow ?? data.targetRow;
        if (!affectedRow) throw new Error("Selecione a fileira do clima.");

        // Garante única instância dessa fileira+chave (substitui se já existe)
        await tx.matchWeather.deleteMany({
          where: { matchId: data.matchId, affectedRow },
        });
        await tx.matchWeather.create({
          data: {
            matchId: data.matchId,
            weatherKey: engineKey,
            affectedRow,
            cardId: card.id,
          },
        });
      }

      // Carta de clima vai pro descarte
      await tx.matchHand.update({
        where: { id: handEntry.id },
        data:  { zone: "DISCARD" },
      });

      await logEvent(tx, data.matchId, match.currentRound, data.side, "WEATHER",
        { engineKey, affectedRow: data.targetRow });

      await persistRecomputedPower(tx, data.matchId);
    }
    // ── Cartas SPECIAL / UNIT normal ──
    else {
      // Valida fileira
      if (!cardAllowsRow(card.rows, data.targetRow)) {
        throw new Error("Esta carta não pode ser jogada nessa fileira.");
      }

      // SPY → vai pro lado inimigo
      const isSpy = card.ability?.engineKey === "SPY";
      const ownerSide: Side = isSpy ? otherSide(data.side) : data.side;

      // Coloca na mesa (UNIT/SPECIAL persistem; alguns SPECIAL puros poderiam só efeito,
      // mas por simplicidade tudo vai pra mesa exceto WEATHER)
      const newBoardCard = await tx.matchBoardCard.create({
        data: {
          matchId: data.matchId,
          side: ownerSide,
          cardId: card.id,
          row: data.targetRow,
          basePower: card.power,
          power: card.power,
          isToken: false,
          shielded: card.ability?.engineKey === "SHIELD",
        },
      });

      await tx.matchHand.update({
        where: { id: handEntry.id },
        data:  { zone: "DISCARD" },
      });

      await logEvent(tx, data.matchId, match.currentRound, data.side, "PLAY_CARD",
        { cardId: card.id, row: data.targetRow, asSpy: isSpy });

      // ── Aplica habilidade da carta jogada ──
      if (card.ability?.engineKey && card.ability?.engineValue !== null) {
        const ek = card.ability.engineKey;
        const ev = card.ability.engineValue ?? 0;

        if (ek === "BOOST") {
          // Aumenta basePower de um aliado-alvo
          if (data.targetBoardCardId) {
            const target = await tx.matchBoardCard.findUnique({ where: { id: data.targetBoardCardId } });
            if (target && target.matchId === data.matchId && target.side === data.side) {
              await tx.matchBoardCard.update({
                where: { id: target.id },
                data:  { basePower: target.basePower + ev },
              });
              await logEvent(tx, data.matchId, match.currentRound, data.side, "BOOST",
                { targetId: target.id, amount: ev });
            }
          }
        } else if (ek === "DAMAGE") {
          if (data.targetBoardCardId) {
            const target = await tx.matchBoardCard.findUnique({ where: { id: data.targetBoardCardId } });
            if (target && target.matchId === data.matchId && target.side !== ownerSide) {
              if (target.shielded) {
                await tx.matchBoardCard.update({
                  where: { id: target.id },
                  data:  { shielded: false },
                });
                await logEvent(tx, data.matchId, match.currentRound, data.side, "DAMAGE_BLOCKED",
                  { targetId: target.id });
              } else {
                const newBase = target.basePower - ev;
                if (newBase <= 0) {
                  await tx.matchBoardCard.delete({ where: { id: target.id } });
                  await logEvent(tx, data.matchId, match.currentRound, data.side, "DESTROY",
                    { targetId: target.id, by: "DAMAGE" });
                } else {
                  await tx.matchBoardCard.update({
                    where: { id: target.id },
                    data:  { basePower: newBase },
                  });
                  await logEvent(tx, data.matchId, match.currentRound, data.side, "DAMAGE",
                    { targetId: target.id, amount: ev, newBase });
                }
              }
            }
          }
        } else if (ek === "SPAWN") {
          // Invoca ev tokens da própria carta na mesma fileira
          for (let i = 0; i < ev; i++) {
            await tx.matchBoardCard.create({
              data: {
                matchId: data.matchId,
                side: ownerSide,
                cardId: card.id,
                row: data.targetRow,
                basePower: 1,
                power: 1,
                isToken: true,
              },
            });
          }
          await logEvent(tx, data.matchId, match.currentRound, data.side, "SPAWN",
            { count: ev, cardId: card.id });
        } else if (ek === "SPY" || ek === "DRAW") {
          // Compra ev cartas do próprio deck (mesmo SPY: o espião beneficia quem o jogou)
          const drawFrom = await tx.matchHand.findMany({
            where: { matchId: data.matchId, side: data.side, zone: "DECK" },
            orderBy: { deckOrder: "asc" },
            take: ev,
          });
          for (const d of drawFrom) {
            await tx.matchHand.update({
              where: { id: d.id },
              data:  { zone: "HAND" },
            });
          }
          await logEvent(tx, data.matchId, match.currentRound, data.side,
            ek === "SPY" ? "SPY_DRAW" : "DRAW", { count: drawFrom.length });
        } else if (ek === "HEAL") {
          // Restaura uma carta aliada com basePower < poder original da definição
          if (data.targetBoardCardId) {
            const target = await tx.matchBoardCard.findUnique({
              where: { id: data.targetBoardCardId },
              include: { card: true },
            });
            if (target && target.matchId === data.matchId && target.side === data.side) {
              await tx.matchBoardCard.update({
                where: { id: target.id },
                data:  { basePower: target.card.power },
              });
              await logEvent(tx, data.matchId, match.currentRound, data.side, "HEAL",
                { targetId: target.id, restoredTo: target.card.power });
            }
          }
        }
        // SHIELD já foi tratado na criação (shielded: true)
        // BOND não tem efeito ativo, só passivo no recomputePower
      }

      await persistRecomputedPower(tx, data.matchId);
    }

    // Decrementa carta do deck count (informativo)
    await tx.matchPlayer.update({
      where: { id: player.id },
      data:  { deckCardCount: { decrement: 1 } },
    });

    // Passa o turno (se o outro não passou)
    const opponent = await tx.matchPlayer.findUnique({
      where: { matchId_side: { matchId: data.matchId, side: otherSide(data.side) } },
    });
    const nextTurnSide: Side = opponent && !opponent.hasPassed
      ? otherSide(data.side)
      : data.side;

    await tx.match.update({
      where: { id: data.matchId },
      data:  { currentTurnSide: nextTurnSide },
    });
  });

  revalidatePath(`/partidas/${data.matchId}`);
}

// ─────────────────────────────────────────────
// 4. PASSAR A VEZ (skip o resto da ronda)
// ─────────────────────────────────────────────

export async function passRoundAction(matchId: string, side: Side) {
  await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({ where: { id: matchId } });
    if (!match) throw new Error("Partida não encontrada.");
    if (match.status !== "PLAYING") throw new Error("Não é hora de passar.");
    if (match.currentTurnSide !== side) throw new Error("Não é seu turno.");

    const player = await tx.matchPlayer.findUnique({
      where: { matchId_side: { matchId, side } },
    });
    if (!player) throw new Error("Lado inválido.");
    if (player.hasPassed) throw new Error("Você já passou.");

    await tx.matchPlayer.update({
      where: { id: player.id },
      data:  { hasPassed: true },
    });

    await logEvent(tx, matchId, match.currentRound, side, "PASS", {});

    const opponent = await tx.matchPlayer.findUnique({
      where: { matchId_side: { matchId, side: otherSide(side) } },
    });
    if (!opponent) throw new Error("Oponente não encontrado.");

    if (opponent.hasPassed) {
      await finalizeRound(tx, matchId);
    } else {
      await tx.match.update({
        where: { id: matchId },
        data:  { currentTurnSide: otherSide(side) },
      });
    }
  });

  revalidatePath(`/partidas/${matchId}`);
}

// ─────────────────────────────────────────────
// 5. ATIVAR LÍDER (apenas se leaderMode === ACTIVE)
// ─────────────────────────────────────────────

export async function activateLeaderAction(data: {
  matchId: string;
  side: Side;
  targetRow?: Row;
  targetBoardCardId?: string;
}) {
  await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({ where: { id: data.matchId } });
    if (!match) throw new Error("Partida não encontrada.");
    if (match.status !== "PLAYING") throw new Error("Não é hora de jogar.");
    if (match.currentTurnSide !== data.side) throw new Error("Não é seu turno.");

    const player = await tx.matchPlayer.findUnique({
      where: { matchId_side: { matchId: data.matchId, side: data.side } },
      include: { deck: { include: { leader: { include: { card: { include: { ability: true } } } } } } },
    });
    if (!player) throw new Error("Lado inválido.");
    if (player.hasPassed) throw new Error("Você já passou.");
    if (player.leaderUsed) throw new Error("Habilidade do líder já foi usada.");

    const leaderCard = player.deck.leader?.card;
    if (!leaderCard) throw new Error("Deck sem líder.");
    if (leaderCard.leaderMode !== "ACTIVE") {
      throw new Error("Este líder não tem habilidade ativa.");
    }
    if (!leaderCard.ability?.engineKey) {
      throw new Error("Líder ativo sem habilidade configurada.");
    }

    const ek = leaderCard.ability.engineKey;
    const ev = leaderCard.ability.engineValue ?? 0;

    // Aplica efeito do líder (subset do que cartas normais fazem)
    if (ek === "BOOST" && data.targetBoardCardId) {
      const t = await tx.matchBoardCard.findUnique({ where: { id: data.targetBoardCardId } });
      if (t && t.side === data.side) {
        await tx.matchBoardCard.update({ where: { id: t.id }, data: { basePower: t.basePower + ev } });
      }
    } else if (ek === "DAMAGE" && data.targetBoardCardId) {
      const t = await tx.matchBoardCard.findUnique({ where: { id: data.targetBoardCardId } });
      if (t && t.side !== data.side) {
        if (t.shielded) {
          await tx.matchBoardCard.update({ where: { id: t.id }, data: { shielded: false } });
        } else {
          const newBase = t.basePower - ev;
          if (newBase <= 0) await tx.matchBoardCard.delete({ where: { id: t.id } });
          else await tx.matchBoardCard.update({ where: { id: t.id }, data: { basePower: newBase } });
        }
      }
    } else if (ek === "DRAW") {
      const drawFrom = await tx.matchHand.findMany({
        where: { matchId: data.matchId, side: data.side, zone: "DECK" },
        orderBy: { deckOrder: "asc" },
        take: ev,
      });
      for (const d of drawFrom) {
        await tx.matchHand.update({ where: { id: d.id }, data: { zone: "HAND" } });
      }
    } else if (ek === "CLEAR_WEATHER") {
      await tx.matchWeather.deleteMany({ where: { matchId: data.matchId } });
    } else if (ek === "HEAL" && data.targetBoardCardId) {
      const t = await tx.matchBoardCard.findUnique({
        where: { id: data.targetBoardCardId },
        include: { card: true },
      });
      if (t && t.side === data.side) {
        await tx.matchBoardCard.update({ where: { id: t.id }, data: { basePower: t.card.power } });
      }
    }

    await tx.matchPlayer.update({
      where: { id: player.id },
      data:  { leaderUsed: true },
    });

    await logEvent(tx, data.matchId, match.currentRound, data.side, "LEADER_ABILITY",
      { engineKey: ek, value: ev });

    await persistRecomputedPower(tx, data.matchId);

    // Líder ativo conta como turno: passa pro outro (se não passou)
    const opponent = await tx.matchPlayer.findUnique({
      where: { matchId_side: { matchId: data.matchId, side: otherSide(data.side) } },
    });
    const nextTurnSide: Side = opponent && !opponent.hasPassed ? otherSide(data.side) : data.side;
    await tx.match.update({
      where: { id: data.matchId },
      data:  { currentTurnSide: nextTurnSide },
    });
  });

  revalidatePath(`/partidas/${data.matchId}`);
}

// ─────────────────────────────────────────────
// HELPER: finaliza ronda (chamado quando ambos passaram)
// ─────────────────────────────────────────────

async function finalizeRound(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  matchId: string,
) {
  const match = await tx.match.findUnique({ where: { id: matchId } });
  if (!match) return;

  const board = await tx.matchBoardCard.findMany({ where: { matchId } });
  const weather = await tx.matchWeather.findMany({ where: { matchId } });
  const cardDefs = await buildCardDefs(board.map((b) => b.cardId));

  const { winner, powerA, powerB } = decideRoundWinner(
    mapBoardToState(board), mapWeatherToState(weather), cardDefs,
  );

  await logEvent(tx, matchId, match.currentRound, null, "ROUND_END",
    { winner, powerA, powerB });

  const players = await tx.matchPlayer.findMany({ where: { matchId } });
  for (const p of players) {
    if (winner === "DRAW" || winner === p.side) {
      await tx.matchPlayer.update({
        where: { id: p.id },
        data:  { roundsWon: { increment: 1 } },
      });
    }
  }

  const updatedPlayers = await tx.matchPlayer.findMany({ where: { matchId } });
  const winsA = updatedPlayers.find((p) => p.side === "A")?.roundsWon ?? 0;
  const winsB = updatedPlayers.find((p) => p.side === "B")?.roundsWon ?? 0;

  const overallWinner = matchWinner(winsA, winsB);

  if (overallWinner) {
    await tx.match.update({
      where: { id: matchId },
      data:  {
        status: "FINISHED",
        winnerSide: overallWinner,
        finishedAt: new Date(),
        currentTurnSide: null,
      },
    });
    await logEvent(tx, matchId, match.currentRound, null, "MATCH_END",
      { winner: overallWinner, winsA, winsB });
    return;
  }

  const persistentLeaders = await tx.matchBoardCard.findMany({
    where: { matchId },
    include: { card: true },
  });
  const idsToDelete = persistentLeaders
    .filter((b) => !(b.card.cardType === "LEADER" && b.card.leaderMode === "PERSISTENT"))
    .map((b) => b.id);

  await tx.matchBoardCard.deleteMany({ where: { id: { in: idsToDelete } } });
  await tx.matchWeather.deleteMany({ where: { matchId } });

  const nextRound = match.currentRound + 1;
  const newStarter = nextStartingSide(
    (match.startsRoundSide ?? "A") as Side,
    winner,
  );

  for (const p of updatedPlayers) {
    await tx.matchPlayer.update({
      where: { id: p.id },
      data:  {
        hasPassed: false,
        redrawsLeft: redrawsForRound(nextRound),
      },
    });
  }

  await tx.match.update({
    where: { id: matchId },
    data:  {
      currentRound: nextRound,
      currentTurnSide: newStarter,
      startsRoundSide: newStarter,
      status: "REDRAW",
    },
  });

  await logEvent(tx, matchId, nextRound, null, "ROUND_START",
    { round: nextRound, starter: newStarter });
}

// ─────────────────────────────────────────────
// 6. PULAR REDRAW (jogador decide não trocar nada)
// ─────────────────────────────────────────────

export async function skipRedrawAction(matchId: string, side: Side) {
  await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({ where: { id: matchId } });
    if (!match) throw new Error("Partida não encontrada.");
    if (match.status !== "REDRAW") throw new Error("Não é hora de redraw.");
    if (match.currentTurnSide !== side) throw new Error("Não é sua vez de redraw.");

    const player = await tx.matchPlayer.findUnique({
      where: { matchId_side: { matchId, side } },
    });
    if (!player) throw new Error("Lado inválido.");

    await tx.matchPlayer.update({
      where: { id: player.id },
      data:  { redrawsLeft: 0 },
    });

    await logEvent(tx, matchId, match.currentRound, side, "REDRAW_SKIP", {});

    const opponent = await tx.matchPlayer.findUnique({
      where: { matchId_side: { matchId, side: otherSide(side) } },
    });

    if (opponent && opponent.redrawsLeft === 0) {
      await tx.match.update({
        where: { id: matchId },
        data:  {
          status: "PLAYING",
          currentTurnSide: match.startsRoundSide,
        },
      });
      await logEvent(tx, matchId, match.currentRound, null, "ROUND_START",
        { round: match.currentRound });
    } else {
      await tx.match.update({
        where: { id: matchId },
        data:  { currentTurnSide: otherSide(side) },
      });
    }
  });

  revalidatePath(`/partidas/${matchId}`);
}

// ─────────────────────────────────────────────
// 7. ABANDONAR PARTIDA (cleanup)
// ─────────────────────────────────────────────

export async function abandonMatchAction(matchId: string) {
  await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({ where: { id: matchId } });
    if (!match) throw new Error("Partida não encontrada.");
    if (match.status === "FINISHED") return;

    await tx.match.update({
      where: { id: matchId },
      data:  { status: "FINISHED", finishedAt: new Date(), winnerSide: "DRAW" },
    });
    await logEvent(tx, matchId, match.currentRound, null, "MATCH_ABANDONED", {});
  });

  revalidatePath(`/partidas/${matchId}`);
  revalidatePath("/partidas");
}