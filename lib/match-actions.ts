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
import { notifyMatchChange } from "./match-events";

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
      isElite: c.isElite,
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
  const immunities = await tx.matchRowImmunity.findMany({ where: { matchId, turnsLeft: { gt: 0 } } });
  const cardDefs = await buildCardDefs(board.map((b) => b.cardId));
  const recomputed = recomputePower(
    mapBoardToState(board),
    mapWeatherToState(weather),
    cardDefs,
    immunities.map((i) => ({ side: i.side as Side, row: i.row as Row, turnsLeft: i.turnsLeft })),
  );
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
  notifyMatchChange(result.id);
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
  notifyMatchChange(matchId);
}

// ─────────────────────────────────────────────
// 3. JOGAR CARTA
// ─────────────────────────────────────────────

// Decrementa todas as imunidades ativas. Chamada apos cada turno completo.
// Verifica se carta destruida tem habilidade ON_DEATH_SPAWN e ja invoca a carta-alvo na mao do dono
async function triggerOnDeath(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  matchId: string,
  destroyedBoardCardId: string,
) {
  // Carrega a board card destruida JUNTO com sua carta e ability (antes do delete)
  const dying = await tx.matchBoardCard.findUnique({
    where: { id: destroyedBoardCardId },
    include: { card: { include: { ability: true } } },
  });
  if (!dying) return;
  // Move a entrada de MatchHand correspondente para DISCARD (cemiterio)
  // Usa handEntryId quando disponivel (precisao), fallback para busca por cardId+side+zone
  if (dying.handEntryId) {
    await tx.matchHand.updateMany({
      where: { id: dying.handEntryId, zone: "BOARD" },
      data: { zone: "DISCARD" },
    });
  } else {
    const handEntry = await tx.matchHand.findFirst({
      where: { matchId, side: dying.side, cardId: dying.cardId, zone: "BOARD" },
    });
    if (handEntry) {
      await tx.matchHand.update({ where: { id: handEntry.id }, data: { zone: "DISCARD" } });
    }
  }
  const ek = dying.card.ability?.engineKey;
  if (ek !== "ON_DEATH_SPAWN") return;
  const csv = dying.card.ability?.targetCardIdsCsv;
  if (!csv) return;
  const targetCardIds = csv.split(",").filter(Boolean);
  if (targetCardIds.length === 0) return;
  // Pega a primeira carta-alvo (modelo "1 carta especifica")
  const spawnId = targetCardIds[0];
  // Coloca na mao do dono. deckOrder grande (vai pro fim da mao)
  const maxDeckOrder = await tx.matchHand.aggregate({
    where: { matchId, side: dying.side },
    _max: { deckOrder: true },
  });
  const newOrder = (maxDeckOrder._max.deckOrder ?? 0) + 1;
  await tx.matchHand.create({
    data: {
      matchId,
      side: dying.side as Side,
      cardId: spawnId,
      zone: "HAND",
      deckOrder: newOrder,
    },
  });
}

async function decrementImmunities(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  matchId: string,
) {
  const active = await tx.matchRowImmunity.findMany({ where: { matchId, turnsLeft: { gt: 0 } } });
  for (const i of active) {
    if (i.turnsLeft <= 1) {
      await tx.matchRowImmunity.delete({ where: { id: i.id } });
    } else {
      await tx.matchRowImmunity.update({ where: { id: i.id }, data: { turnsLeft: { decrement: 1 } } });
    }
  }
}

export async function playCardAction(data: {
  matchId: string;
  side: Side;
  handCardId: string;     // MatchHand.id
  targetRow: Row;
  targetBoardCardId?: string;  // alvo (BOOST, DAMAGE, HEAL, etc)
  effectRow?: Row;  // fileira-alvo para habilidades ROW_*
  multiTargetIds?: string[];  // varios alvos (BOOST_MANY / Nutrir)
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

        // Carrega imunidades de fileira ATIVAS pra checagens posteriores
        const _immuneSet = new Set<string>();
        {
          const _imm = await tx.matchRowImmunity.findMany({ where: { matchId: data.matchId, turnsLeft: { gt: 0 } } });
          for (const i of _imm) _immuneSet.add(`${i.side}|${i.row}`);
        }
        function _isImmune(side: string, row: string) {
          return _immuneSet.has(`${side}|${row}`);
        }

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
            handEntryId: handEntry.id,
        },
      });

      await tx.matchHand.update({
        where: { id: handEntry.id },
        data:  { zone: "BOARD" },
      });

      await logEvent(tx, data.matchId, match.currentRound, data.side, "PLAY_CARD",
        { cardId: card.id, row: data.targetRow, asSpy: isSpy });

      // ── Aplica habilidade da carta jogada ──
      if (card.ability?.engineKey && card.ability?.engineValue !== null) {
        const ek = card.ability.engineKey;
        const ev = card.ability.engineValue ?? 0;

        if (ek === "BOOST") {
          // Aumenta basePower de um aliado-alvo (Elite imune)
          if (data.targetBoardCardId) {
            const target = await tx.matchBoardCard.findUnique({
              where: { id: data.targetBoardCardId },
              include: { card: true },
            });
            if (target && target.matchId === data.matchId && target.side === data.side && !target.card.isElite) {
              await tx.matchBoardCard.update({
                where: { id: target.id },
                data:  { basePower: target.basePower + ev },
              });
              await logEvent(tx, data.matchId, match.currentRound, data.side, "BOOST",
                { targetId: target.id, amount: ev });
            }
          }
        } else if (ek === "BOOST_MANY" && data.multiTargetIds && data.multiTargetIds.length > 0) {
        // Nutrir: ev de boost em ate N criaturas aliadas escolhidas pelo jogador
        const maxN = card.ability?.targetCount ?? data.multiTargetIds.length;
        const chosen = data.multiTargetIds.slice(0, maxN);
        const targets = await tx.matchBoardCard.findMany({
          where: { id: { in: chosen }, matchId: data.matchId, side: ownerSide },
          include: { card: true },
        });
        for (const t of targets) {
          if (t.card.isElite) continue;
          await tx.matchBoardCard.update({
            where: { id: t.id },
            data:  { basePower: t.basePower + ev },
          });
        }
        await logEvent(tx, data.matchId, match.currentRound, data.side, "BOOST_MANY",
          { count: targets.length, amount: ev });
      } else if (ek === "DAMAGE") {
          if (data.targetBoardCardId) {
            const target = await tx.matchBoardCard.findUnique({
              where: { id: data.targetBoardCardId },
              include: { card: true },
            });
            if (target && target.matchId === data.matchId && target.side !== ownerSide && !target.card.isElite) {
              if (_isImmune(target.side, target.row)) {
                await logEvent(tx, data.matchId, match.currentRound, data.side, "DAMAGE_BLOCKED",
                  { targetId: target.id, by: "IMMUNE_ROW" });
              } else if (target.shielded) {
                await tx.matchBoardCard.update({
                  where: { id: target.id },
                  data:  { shielded: false },
                });
                await logEvent(tx, data.matchId, match.currentRound, data.side, "DAMAGE_BLOCKED",
                  { targetId: target.id });
              } else {
                const newBase = target.basePower - ev;
                if (newBase <= 0) {
                  await triggerOnDeath(tx, data.matchId, target.id);
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
                } else if (ek === "PULL_BY_NAME") {
          // Busca as cartas alvo da habilidade
          const ability = card.ability;
          if (ability?.targetCardIdsCsv) {
            const targetIds = ability.targetCardIdsCsv.split(",").filter(Boolean);
            // Busca todas as cartas na mao do mesmo lado que sao alvos
            const handTargets = await tx.matchHand.findMany({
              where: {
                matchId: data.matchId,
                side: data.side,
                zone: "HAND",
                cardId: { in: targetIds },
              },
              include: { card: true },
            });

            for (const ht of handTargets) {
              // Decide fileira: usa a primeira fileira permitida da carta
              const allowedRows = ht.card.rows.split(",").filter(Boolean);
              const targetRow = (allowedRows[0] ?? "MELEE") as Row;

              await tx.matchBoardCard.create({
                data: {
                  matchId: data.matchId,
                  side: ownerSide,
                  cardId: ht.card.id,
                  row: targetRow,
                  basePower: ht.card.power,
                  power: ht.card.power,
                  isToken: false,
                  shielded: false,
                },
              });
              await tx.matchHand.update({
                where: { id: ht.id },
                data: { zone: "DISCARD" },
              });
            }

            await logEvent(tx, data.matchId, match.currentRound, data.side, "PULL_BY_NAME",
              { cardId: card.id, pulledCount: handTargets.length });
          }
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
            if (target && target.matchId === data.matchId && target.side === data.side && !target.card.isElite) {
              await tx.matchBoardCard.update({
                where: { id: target.id },
                data:  { basePower: target.card.power },
              });
              await logEvent(tx, data.matchId, match.currentRound, data.side, "HEAL",
                { targetId: target.id, restoredTo: target.card.power });
            }
          }
} else if (ek === "BOOST_ROW") {
          // Inspiracao: +ev de basePower em todos aliados da fileira (effectRow OU targetRow)
          const targetRowEffect = data.effectRow ?? data.targetRow;
          const allies = await tx.matchBoardCard.findMany({
            where: { matchId: data.matchId, side: ownerSide, row: targetRowEffect, id: { not: newBoardCard.id } },
            include: { card: true },
          });
          for (const a of allies) {
            if (a.card.isElite) continue;
            await tx.matchBoardCard.update({ where: { id: a.id }, data: { basePower: a.basePower + ev } });
          }
          await logEvent(tx, data.matchId, match.currentRound, data.side, "BOOST_ROW",
            { row: targetRowEffect, amount: ev, count: allies.length });
        } else if (ek === "MULTIPLY_ROW") {
          // Dadiva: dobra basePower de todos aliados da fileira
          const targetRowEffect = data.effectRow ?? data.targetRow;
          const allies = await tx.matchBoardCard.findMany({
            where: { matchId: data.matchId, side: ownerSide, row: targetRowEffect, id: { not: newBoardCard.id } },
            include: { card: true },
          });
          for (const a of allies) {
            if (a.card.isElite) continue;
            await tx.matchBoardCard.update({ where: { id: a.id }, data: { basePower: a.basePower * 2 } });
          }
          await logEvent(tx, data.matchId, match.currentRound, data.side, "MULTIPLY_ROW",
            { row: targetRowEffect, count: allies.length });
        } else if (ek === "DESTROY_ROW") {
          // Peste: destroi todas as cartas inimigas da fileira escolhida
          const enemyRow = data.effectRow ?? data.targetRow ?? "MELEE";
          if (_isImmune(otherSide(ownerSide), enemyRow)) {
            await logEvent(tx, data.matchId, match.currentRound, data.side, "DAMAGE_BLOCKED",
              { row: enemyRow, by: "IMMUNE_ROW" });
          } else {
            const enemies = await tx.matchBoardCard.findMany({
              where: { matchId: data.matchId, side: otherSide(ownerSide), row: enemyRow },
              include: { card: true },
            });
            for (const e of enemies) {
              if (e.card.isElite) continue;
              await triggerOnDeath(tx, data.matchId, e.id);
              await tx.matchBoardCard.delete({ where: { id: e.id } });
              await logEvent(tx, data.matchId, match.currentRound, data.side, "DESTROY",
                { targetId: e.id, by: "DESTROY_ROW" });
            }
          }
        } else if (ek === "DESTROY_AND_DRAW" && data.targetBoardCardId) {
          // Ciclo da Vida: destroi criatura inimiga E voce compra 1 carta
          const target = await tx.matchBoardCard.findUnique({
            where: { id: data.targetBoardCardId },
            include: { card: true },
          });
          if (target && target.matchId === data.matchId && target.side !== ownerSide && !target.card.isElite && !_isImmune(target.side, target.row)) {
            await triggerOnDeath(tx, data.matchId, target.id);
            await tx.matchBoardCard.delete({ where: { id: target.id } });
            await logEvent(tx, data.matchId, match.currentRound, data.side, "DESTROY",
              { targetId: target.id, by: "DESTROY_AND_DRAW" });
            const drawCount = ev > 0 ? ev : 1;
            const drawFrom = await tx.matchHand.findMany({
              where: { matchId: data.matchId, side: data.side, zone: "DECK" },
              orderBy: { deckOrder: "asc" },
              take: drawCount,
            });
            for (const d of drawFrom) {
              await tx.matchHand.update({ where: { id: d.id }, data: { zone: "HAND" } });
            }
          }
        } else if (ek === "DAMAGE_IF" && data.targetBoardCardId) {
          // Expurgo: destroi inimigo se poder <= ev
          const target = await tx.matchBoardCard.findUnique({
            where: { id: data.targetBoardCardId },
            include: { card: true },
          });
          if (target && target.matchId === data.matchId && target.side !== ownerSide && !target.card.isElite && !_isImmune(target.side, target.row)) {
            if (target.power <= ev) {
              await triggerOnDeath(tx, data.matchId, target.id);
              await tx.matchBoardCard.delete({ where: { id: target.id } });
              await logEvent(tx, data.matchId, match.currentRound, data.side, "DESTROY",
                { targetId: target.id, by: "DAMAGE_IF", threshold: ev });
            }
          }
        } else if (ek === "REVIVE_RANDOM") {
          // Ritual Profano: puxa ev cartas aleatorias do cemiterio (zone=DISCARD) pro proprio campo
          const reviveCount = ev > 0 ? ev : 2;
          const discardPool = await tx.matchHand.findMany({
            where: { matchId: data.matchId, zone: "DISCARD" },
            include: { card: true },
          });
          const eligible = discardPool.filter((d) => d.card.cardType === "UNIT");
          const shuffled = [...eligible].sort(() => Math.random() - 0.5);
          const picked = shuffled.slice(0, reviveCount);
          for (const p of picked) {
            const allowedRows = p.card.rows.split(",").filter(Boolean);
            const targetRow = (allowedRows[0] ?? "MELEE") as Row;
            await tx.matchBoardCard.create({
              data: {
                matchId: data.matchId,
                side: ownerSide,
                cardId: p.cardId,
                row: targetRow,
                basePower: p.card.power,
                power: p.card.power,
                isToken: false,
                shielded: false,
              },
            });
            await tx.matchHand.delete({ where: { id: p.id } });
            await logEvent(tx, data.matchId, match.currentRound, data.side, "REVIVE",
              { cardId: p.cardId, by: "REVIVE_RANDOM", row: targetRow });
          }
        } else if (ek === "REVIVE_TO_HAND") {
          // Reforja: recupera 1 carta nao-UNIT do PROPRIO cemiterio para a mao
          const myDiscard = await tx.matchHand.findMany({
            where: { matchId: data.matchId, side: data.side, zone: "DISCARD" },
            include: { card: true },
          });
          const eligible = myDiscard.filter((d) => d.card.cardType !== "UNIT" && d.card.cardType !== "LEADER");
          if (eligible.length > 0) {
            const pick = eligible[Math.floor(Math.random() * eligible.length)];
            await tx.matchHand.update({ where: { id: pick.id }, data: { zone: "HAND" } });
            await logEvent(tx, data.matchId, match.currentRound, data.side, "REVIVE_TO_HAND",
              { cardId: pick.cardId });
          }
        } else if (ek === "TUTOR_BY_TYPE") {
          // Caos: pega ev cartas do PROPRIO deck filtradas por cardType
          const tutorType = card.ability?.targetCardType;
          if (tutorType) {
            const drawCount = ev > 0 ? ev : 3;
            const deckCards = await tx.matchHand.findMany({
              where: { matchId: data.matchId, side: data.side, zone: "DECK" },
              include: { card: true },
              orderBy: { deckOrder: "asc" },
            });
            const eligibleCards = deckCards.filter((d) => d.card.cardType === tutorType);
            const shuffled = [...eligibleCards].sort(() => Math.random() - 0.5);
            const picked = shuffled.slice(0, drawCount);
            for (const p of picked) {
              await tx.matchHand.update({ where: { id: p.id }, data: { zone: "HAND" } });
            }
            await logEvent(tx, data.matchId, match.currentRound, data.side, "TUTOR_BY_TYPE",
              { cardType: tutorType, count: picked.length });
          }
        } else if (ek === "IMMUNE_ROW") {
          // Bloqueio Temporal: cria imunidade temporaria na fileira escolhida
          const immuneRow = data.effectRow ?? data.targetRow;
          const turns = ev > 0 ? ev : 1;
          if (immuneRow) {
            await tx.matchRowImmunity.upsert({
              where: { matchId_side_row: { matchId: data.matchId, side: ownerSide, row: immuneRow } },
              update: { turnsLeft: turns, appliedRound: match.currentRound, appliedBy: card.id },
              create: {
                matchId: data.matchId,
                side: ownerSide,
                row: immuneRow,
                turnsLeft: turns,
                appliedRound: match.currentRound,
                appliedBy: card.id,
              },
            });
            await logEvent(tx, data.matchId, match.currentRound, data.side, "IMMUNE_ROW",
              { row: immuneRow, turns });
            await persistRecomputedPower(tx, data.matchId);
          }
        } else if (ek === "EVOLVE_FACTION" && data.targetBoardCardId) {
          // Evolucao: destroi um aliado seu, puxa outra carta da mesma faccao do deck pro campo
          const target = await tx.matchBoardCard.findUnique({
            where: { id: data.targetBoardCardId },
            include: { card: true },
          });
          if (target && target.matchId === data.matchId && target.side === ownerSide) {
            const targetFactionId = target.card.factionId;
            await triggerOnDeath(tx, data.matchId, target.id);
            await tx.matchBoardCard.delete({ where: { id: target.id } });
            await logEvent(tx, data.matchId, match.currentRound, data.side, "DESTROY",
              { targetId: target.id, by: "EVOLVE_FACTION" });
            const deckCards = await tx.matchHand.findMany({
              where: { matchId: data.matchId, side: data.side, zone: "DECK" },
              include: { card: true },
              orderBy: { deckOrder: "asc" },
            });
            const sameFaction = deckCards.filter((d) => d.card.factionId === targetFactionId && d.card.cardType === "UNIT");
            if (sameFaction.length > 0) {
              const pick = sameFaction[Math.floor(Math.random() * sameFaction.length)];
              const allowedRows = pick.card.rows.split(",").filter(Boolean);
              const targetRow = (allowedRows[0] ?? "MELEE") as Row;
              await tx.matchBoardCard.create({
                data: {
                  matchId: data.matchId,
                  side: ownerSide,
                  cardId: pick.cardId,
                  row: targetRow,
                  basePower: pick.card.power,
                  power: pick.card.power,
                  isToken: false,
                  shielded: false,
                },
              });
              await tx.matchHand.delete({ where: { id: pick.id } });
              await logEvent(tx, data.matchId, match.currentRound, data.side, "EVOLVE_FACTION",
                { destroyedCardId: target.card.id, summonedCardId: pick.cardId });
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

    await decrementImmunities(tx, data.matchId);
    await tx.match.update({
      where: { id: data.matchId },
      data:  { currentTurnSide: nextTurnSide },
    });
  });

  revalidatePath(`/partidas/${data.matchId}`);
  notifyMatchChange(data.matchId);
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
  notifyMatchChange(matchId);
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
      const t = await tx.matchBoardCard.findUnique({
        where: { id: data.targetBoardCardId },
        include: { card: true },
      });
      if (t && t.side === data.side && !t.card.isElite) {
        await tx.matchBoardCard.update({ where: { id: t.id }, data: { basePower: t.basePower + ev } });
      }
    } else if (ek === "DAMAGE" && data.targetBoardCardId) {
        const t = await tx.matchBoardCard.findUnique({
          where: { id: data.targetBoardCardId },
          include: { card: true },
        });
        if (t && t.side !== data.side && !t.card.isElite) {
        if (t.shielded) {
          await tx.matchBoardCard.update({ where: { id: t.id }, data: { shielded: false } });
        } else {
          const newBase = t.basePower - ev;
          if (newBase <= 0) {
            await triggerOnDeath(tx, data.matchId, t.id);
            await tx.matchBoardCard.delete({ where: { id: t.id } });
          } else {
            await tx.matchBoardCard.update({ where: { id: t.id }, data: { basePower: newBase } });
          }
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
    } else if (ek === "HEAL" && data.targetBoardCardId) {
        const t = await tx.matchBoardCard.findUnique({
          where: { id: data.targetBoardCardId },
          include: { card: true },
        });
        if (t && t.side === data.side && !t.card.isElite) {
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
    await decrementImmunities(tx, data.matchId);
    await tx.match.update({
      where: { id: data.matchId },
      data:  { currentTurnSide: nextTurnSide },
    });
  });

  revalidatePath(`/partidas/${data.matchId}`);
  notifyMatchChange(data.matchId);
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

  const immunitiesNow = await tx.matchRowImmunity.findMany({ where: { matchId, turnsLeft: { gt: 0 } } });
  const { winner, powerA, powerB } = decideRoundWinner(
    mapBoardToState(board),
    mapWeatherToState(weather),
    cardDefs,
    immunitiesNow.map((i) => ({ side: i.side as Side, row: i.row as Row, turnsLeft: i.turnsLeft })),
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
  // Cartas que estavam no campo viram cemiterio
  await tx.matchHand.updateMany({ where: { matchId, zone: "BOARD" }, data: { zone: "DISCARD" } });
  await tx.matchWeather.deleteMany({ where: { matchId } });
  await tx.matchRowImmunity.deleteMany({ where: { matchId } });

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
  notifyMatchChange(matchId);
}

// ─────────────────────────────────────────────
// 7. ABANDONAR PARTIDA (cleanup)
// ─────────────────────────────────────────────

export async function abandonMatchAction(matchId: string) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Você precisa estar logado.");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) throw new Error("Usuário não encontrado.");

  await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: { players: true },
    });
    if (!match) throw new Error("Partida não encontrada.");
    if (match.status === "FINISHED") return;

    // Em HOTSEAT, qualquer jogador pode abandonar (mesma máquina, mesma sessão).
    // Em ONLINE, só quem está jogando pode abandonar (e perde).
    let loserSide: Side | null = null;

    if (match.mode === "ONLINE") {
      const me = match.players.find((p) => p.userId === user.id);
      if (!me) throw new Error("Você não está nesta partida.");
      loserSide = me.side as Side;
    } else {
      // HOTSEAT: quem clicou é quem está no turno atual
      loserSide = (match.currentTurnSide ?? "A") as Side;
    }

    const winnerSide: Side = otherSide(loserSide);

    await tx.match.update({
      where: { id: matchId },
      data: {
        status: "FINISHED",
        winnerSide,
        finishedAt: new Date(),
        currentTurnSide: null,
      },
    });

    await logEvent(tx, matchId, match.currentRound, loserSide, "MATCH_ABANDONED",
      { abandonedBy: loserSide, winner: winnerSide });
  });

  revalidatePath(`/partidas/${matchId}`);
  revalidatePath("/partidas");
  notifyMatchChange(matchId);
}

// ─────────────────────────────────────────────
// 8. OFERECER EMPATE
// ─────────────────────────────────────────────

export async function offerDrawAction(matchId: string) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Você precisa estar logado.");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) throw new Error("Usuário não encontrado.");

  await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: { players: true },
    });
    if (!match) throw new Error("Partida não encontrada.");
    if (match.status === "FINISHED") throw new Error("Partida já terminou.");

    let mySide: Side;
    if (match.mode === "ONLINE") {
      const me = match.players.find((p) => p.userId === user.id);
      if (!me) throw new Error("Você não está nesta partida.");
      mySide = me.side as Side;
    } else {
      mySide = (match.currentTurnSide ?? "A") as Side;
    }

    if (match.drawOfferedBy === mySide) {
      throw new Error("Você já ofereceu empate.");
    }

    await tx.match.update({
      where: { id: matchId },
      data: { drawOfferedBy: mySide },
    });

    await logEvent(tx, matchId, match.currentRound, mySide, "DRAW_OFFERED", {});
  });

  revalidatePath(`/partidas/${matchId}`);
  notifyMatchChange(matchId);
}

// ─────────────────────────────────────────────
// 9. RESPONDER OFERTA DE EMPATE
// ─────────────────────────────────────────────

export async function respondDrawOfferAction(matchId: string, accept: boolean) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Você precisa estar logado.");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) throw new Error("Usuário não encontrado.");

  await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: { players: true },
    });
    if (!match) throw new Error("Partida não encontrada.");
    if (match.status === "FINISHED") throw new Error("Partida já terminou.");
    if (!match.drawOfferedBy) throw new Error("Não há oferta de empate ativa.");

    let mySide: Side;
    if (match.mode === "ONLINE") {
      const me = match.players.find((p) => p.userId === user.id);
      if (!me) throw new Error("Você não está nesta partida.");
      mySide = me.side as Side;
    } else {
      // HOTSEAT: quem responde é quem NÃO ofereceu
      mySide = otherSide(match.drawOfferedBy as Side);
    }

    if (mySide === match.drawOfferedBy) {
      throw new Error("Você não pode responder à sua própria oferta.");
    }

    if (accept) {
      // Empate aceito: fim de partida com DRAW
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: "FINISHED",
          winnerSide: "DRAW",
          finishedAt: new Date(),
          currentTurnSide: null,
          drawOfferedBy: null,
        },
      });
      await logEvent(tx, matchId, match.currentRound, mySide, "DRAW_ACCEPTED",
        { offeredBy: match.drawOfferedBy });
    } else {
      // Recusado: limpa oferta, jogo continua
      await tx.match.update({
        where: { id: matchId },
        data: { drawOfferedBy: null },
      });
      await logEvent(tx, matchId, match.currentRound, mySide, "DRAW_DECLINED",
        { offeredBy: match.drawOfferedBy });
    }
  });

  revalidatePath(`/partidas/${matchId}`);
  notifyMatchChange(matchId);
}

// ─────────────────────────────────────────────
// 11. PAUSAR PARTIDA
// ─────────────────────────────────────────────

export async function pauseMatchAction(matchId: string) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Você precisa estar logado.");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) throw new Error("Usuário não encontrado.");

  await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: { players: true },
    });
    if (!match) throw new Error("Partida não encontrada.");
    if (match.status === "FINISHED") throw new Error("Partida já terminou.");
    if (match.status === "LOBBY") throw new Error("Não dá pra pausar no lobby.");
    if (match.pausedBy) throw new Error("Partida já está pausada.");

    let mySide: Side;
    if (match.mode === "ONLINE") {
      const me = match.players.find((p) => p.userId === user.id);
      if (!me) throw new Error("Você não está nesta partida.");
      mySide = me.side as Side;
    } else {
      mySide = (match.currentTurnSide ?? "A") as Side;
    }

    await tx.match.update({
      where: { id: matchId },
      data: {
        pausedBy: mySide,
        pausedAt: new Date(),
      },
    });

    await logEvent(tx, matchId, match.currentRound, mySide, "MATCH_PAUSED", {});
  });

  revalidatePath(`/partidas/${matchId}`);
  notifyMatchChange(matchId);
}

// ─────────────────────────────────────────────
// 12. RETOMAR PARTIDA (só quem pausou pode retomar)
// ─────────────────────────────────────────────

export async function resumeMatchAction(matchId: string) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Você precisa estar logado.");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) throw new Error("Usuário não encontrado.");

  await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: { players: true },
    });
    if (!match) throw new Error("Partida não encontrada.");
    if (!match.pausedBy) throw new Error("Partida não está pausada.");

    let mySide: Side;
    if (match.mode === "ONLINE") {
      const me = match.players.find((p) => p.userId === user.id);
      if (!me) throw new Error("Você não está nesta partida.");
      mySide = me.side as Side;
    } else {
      mySide = match.pausedBy as Side;
    }

    if (mySide !== match.pausedBy) {
      throw new Error("Só quem pausou pode retomar a partida.");
    }

    // Ao retomar, reseta o lastSeenAt de todos pra evitar timeout imediato
    // (eles podem ter ficado parados durante a pausa)
    const now = new Date();
    for (const p of match.players) {
      await tx.matchPlayer.update({
        where: { id: p.id },
        data: { lastSeenAt: now, connectionStatus: "ONLINE" },
      });
    }

    await tx.match.update({
      where: { id: matchId },
      data: {
        pausedBy: null,
        pausedAt: null,
      },
    });

    await logEvent(tx, matchId, match.currentRound, mySide, "MATCH_RESUMED", {});
  });

  revalidatePath(`/partidas/${matchId}`);
  notifyMatchChange(matchId);
}
