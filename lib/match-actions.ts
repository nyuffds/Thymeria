// lib/match-actions.ts
// Server actions de partida (HOTSEAT).

"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  type Side, type Row, type BoardCardState, type WeatherState, type CardDef,
  shuffle, cardAllowsRow, recomputePower, decideRoundWinner,
  redrawsForRound, nextStartingSide, matchWinner, otherSide, weatherToRow, weatherToRows,
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
  // Aplica auras: BLOOD_MOON (todas fileiras), BOOST_ROW (fileira X), MULTIPLY_ROW (fileira X)
  const auras = await tx.matchAura.findMany({ where: { matchId } });

  // Funcao helper que retorna o poder final dada side + row + base
  function applyAuras(side: string, row: string, basePower: number): number {
    let bloodMoonBoost = 0;
    let rowBoost = 0;
    let multiplier = 1;
    for (const a of auras) {
      if (a.side !== side) continue;
      if (a.engineKey === "BLOOD_MOON") {
        bloodMoonBoost += a.amount;
      } else if (a.engineKey === "BOOST_ROW" && a.row === row) {
        rowBoost += a.amount;
      } else if (a.engineKey === "MULTIPLY_ROW" && a.row === row) {
        multiplier *= a.amount; // amount = 2
      }
    }
    return basePower * multiplier + bloodMoonBoost + rowBoost;
  }

  const boardWithCards = await tx.matchBoardCard.findMany({ where: { matchId }, include: { card: true } });
  const cardById = new Map(boardWithCards.map((b) => [b.id, b]));

  for (const c of recomputed) {
    const original = cardById.get(c.id);
    if (!original) continue;
    // Elite e imune a auras (boosts globais nao afetam)
    if (original.card.isElite) {
      await tx.matchBoardCard.update({ where: { id: c.id }, data: { power: c.power } });
      continue;
    }
    // c.power ja contem ajustes do recomputePower base. As auras se aplicam a partir do basePower atual.
    // Para BOOST_ROW (somar): adiciona ao c.power.
    // Para MULTIPLY_ROW: nao adicionamos boost, mas modificamos basePower direto antes (ja foi tratado no caster)
    // Para BLOOD_MOON: soma adicional.
    let extra = 0;
    for (const a of auras) {
      if (a.side !== c.side) continue;
      if (a.engineKey === "BLOOD_MOON") {
        extra += a.amount;
      } else if (a.engineKey === "BOOST_ROW" && a.row === c.row) {
        extra += a.amount;
      } else if (a.engineKey === "MULTIPLY_ROW" && a.row === c.row) {
        extra += original.basePower; // dobra: somar basePower extra
      }
    }
    await tx.matchBoardCard.update({
      where: { id: c.id },
      data:  { power: c.power + extra },
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

// Peek nas N primeiras cartas do DECK do jogador (para Profecia revelar)
export async function peekDeckTopAction(matchId: string, side: Side, n: number) {
  const cards = await prisma.matchHand.findMany({
    where: { matchId, side, zone: "DECK" },
    orderBy: { deckOrder: "asc" },
    take: n,
    include: { card: true },
  });
  return cards.map((c) => ({
    handId: c.id,
    cardId: c.cardId,
    name: c.card.name,
    power: c.card.power,
    cardType: c.card.cardType,
    imageUrl: c.card.imageUrl,
  }));
}

export async function playCardAction(data: {
  matchId: string;
  side: Side;
  handCardId: string;     // MatchHand.id
  targetRow: Row;
  targetBoardCardId?: string;  // alvo (BOOST, DAMAGE, HEAL, etc)
  effectRow?: Row;  // fileira-alvo para habilidades ROW_*
  multiTargetIds?: string[];  // varios alvos (BOOST_MANY / Nutrir)
  prophecyRouting?: Array<{ handId: string; destination: "HAND" | "TOP" | "BOTTOM" }>;  // roteamento da Profecia
  // Campos do EFEITO SECUNDARIO (opcional)
  secondaryTargetBoardCardId?: string;
  secondaryTargetRow?: Row;
  secondaryEffectRow?: Row;
  secondaryMultiTargetIds?: string[];
  secondaryProphecyRouting?: Array<{ handId: string; destination: "HAND" | "TOP" | "BOTTOM" }>;
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
        // Mapeia engineKey -> lista de fileiras afetadas (STORM afeta 2)
        const rows = weatherToRows(engineKey);
        if (rows.length === 0) throw new Error("Habilidade de clima invalida.");
        for (const affectedRow of rows) {
          await tx.matchWeather.deleteMany({
            where: { matchId: data.matchId, affectedRow },
          });
          await tx.matchWeather.create({
            data: { matchId: data.matchId, weatherKey: engineKey, affectedRow, cardId: card.id },
          });
        }
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
      // SPECIAL nao ocupa fileira: vai direto pro descarte (igual WEATHER). UNIT vai pro board.
      const goesToBoard = card.cardType === "UNIT";
      const newBoardCard = goesToBoard ? await tx.matchBoardCard.create({
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
      }) : null;

      await tx.matchHand.update({
        where: { id: handEntry.id },
        data:  { zone: goesToBoard ? "BOARD" : "DISCARD" },
      });

      await logEvent(tx, data.matchId, match.currentRound, data.side, "PLAY_CARD",
        { cardId: card.id, row: data.targetRow, asSpy: isSpy });

      // ── Aplica habilidade(s) da carta jogada ──
        if (card.ability?.engineKey && card.ability?.engineValue !== null) {
          // Constroi lista de efeitos: principal + secundario (se existir)
          const effects: Array<{
            ek: string;
            ev: number;
            targetCardIdsCsv: string | null;
            targetCardType: string | null;
            targetCount: number | null;
            targetBoardCardId?: string;
            targetRow?: Row;
            effectRow?: Row;
            multiTargetIds?: string[];
            prophecyRouting?: Array<{ handId: string; destination: "HAND" | "TOP" | "BOTTOM" }>;
          }> = [
            {
              ek: card.ability.engineKey,
              ev: card.ability.engineValue ?? 0,
              targetCardIdsCsv: card.ability.targetCardIdsCsv,
              targetCardType: card.ability.targetCardType,
              targetCount: card.ability.targetCount,
              targetBoardCardId: data.targetBoardCardId,
              targetRow: data.targetRow,
              effectRow: data.effectRow,
              multiTargetIds: data.multiTargetIds,
              prophecyRouting: data.prophecyRouting,
            },
          ];
          if (card.ability.secondaryEngineKey) {
            effects.push({
              ek: card.ability.secondaryEngineKey,
              ev: card.ability.secondaryEngineValue ?? 0,
              targetCardIdsCsv: card.ability.secondaryTargetCardIdsCsv,
              targetCardType: card.ability.secondaryTargetCardType,
              targetCount: card.ability.secondaryTargetCount,
              targetBoardCardId: data.secondaryTargetBoardCardId,
              targetRow: data.secondaryTargetRow,
              effectRow: data.secondaryEffectRow,
              multiTargetIds: data.secondaryMultiTargetIds,
              prophecyRouting: data.secondaryProphecyRouting,
            });
          }

          for (const effect of effects) {
            const ek = effect.ek;
            const ev = effect.ev;
            // Shadow vars: usa o alvo deste efeito especifico (nao o data.* global)
            const effTargetBoardCardId = effect.targetBoardCardId;
            const effTargetRow: Row = effect.targetRow ?? data.targetRow;
            const effEffectRow = effect.effectRow;
            const effMultiTargetIds = effect.multiTargetIds;
            const effProphecyRouting = effect.prophecyRouting;
            const effTargetCardIdsCsv = effect.targetCardIdsCsv;
            const effTargetCardType = effect.targetCardType;
            const effTargetCount = effect.targetCount;

        if (ek === "BOOST") {
          // Aumenta basePower de um aliado-alvo (Elite imune)
          if (effTargetBoardCardId) {
            const target = await tx.matchBoardCard.findUnique({
              where: { id: effTargetBoardCardId },
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
        } else if (ek === "BOOST_MANY" && effMultiTargetIds && effMultiTargetIds.length > 0) {
        // Nutrir: ev de boost em ate N criaturas aliadas escolhidas pelo jogador
        const maxN = effTargetCount ?? effMultiTargetIds.length;
        const chosen = effMultiTargetIds.slice(0, maxN);
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
      } else if (ek === "PROPHECY" && effProphecyRouting) {
        // Profecia: olha as proximas X cartas do deck e roteia cada uma:
        // - HAND: vai pra mao (zone HAND)
        // - TOP: volta pro topo do deck (deckOrder baixo)
        // - BOTTOM: vai pro fundo do deck (deckOrder alto)
        // O frontend ja selecionou as cartas pra rotear (handIds das X primeiras do deck)
        for (const route of effProphecyRouting) {
          if (route.destination === "HAND") {
            await tx.matchHand.update({ where: { id: route.handId }, data: { zone: "HAND" } });
          }
        }
        // Re-ordena o deck: cartas TOP primeiro, depois cartas BOTTOM (no fundo)
        const remainingDeck = await tx.matchHand.findMany({
          where: { matchId: data.matchId, side: data.side, zone: "DECK" },
          orderBy: { deckOrder: "asc" },
        });
        // Para TOPs e BOTTOMs, reordenar
        const topIds = effProphecyRouting.filter((r) => r.destination === "TOP").map((r) => r.handId);
        const bottomIds = effProphecyRouting.filter((r) => r.destination === "BOTTOM").map((r) => r.handId);
        // Pega os outros (nao roteados, ja estavam no DECK)
        const routedIds = new Set([...topIds, ...bottomIds]);
        const others = remainingDeck.filter((d) => !routedIds.has(d.id));
        // Nova ordem: TOPs (em ordem) -> others (em ordem original) -> BOTTOMs (em ordem)
        const newOrder = [...topIds, ...others.map((o) => o.id), ...bottomIds];
        for (let i = 0; i < newOrder.length; i++) {
          await tx.matchHand.update({
            where: { id: newOrder[i] },
            data: { deckOrder: i + 1 },
          });
        }
        await logEvent(tx, data.matchId, match.currentRound, data.side, "PROPHECY",
          {
            toHand: effProphecyRouting.filter((r) => r.destination === "HAND").length,
            toTop: topIds.length,
            toBottom: bottomIds.length,
          });
      } else if (ek === "SHUFFLE_AND_DRAW" && effMultiTargetIds) {
        // Ganancia: jogador escolhe ate engineValue cartas da mao,
        // devolve ao deck (zone HAND -> DECK, shuffle), depois compra targetCount do deck
        const maxToReturn = ev > 0 ? ev : effMultiTargetIds.length;
        const drawCount = effTargetCount ?? 1;
        const chosen = effMultiTargetIds.slice(0, maxToReturn);
        // 1. Move as escolhidas para DECK
        const returning = await tx.matchHand.findMany({
          where: { id: { in: chosen }, matchId: data.matchId, side: data.side, zone: "HAND" },
        });
        if (returning.length > 0) {
          await tx.matchHand.updateMany({
            where: { id: { in: returning.map((r) => r.id) } },
            data: { zone: "DECK" },
          });
        }
        // 2. Re-embaralha o DECK do jogador (re-randomiza deckOrder)
        const deckCards = await tx.matchHand.findMany({
          where: { matchId: data.matchId, side: data.side, zone: "DECK" },
        });
        const newOrders = [...deckCards.map((d) => d.id)].sort(() => Math.random() - 0.5);
        for (let i = 0; i < newOrders.length; i++) {
          await tx.matchHand.update({
            where: { id: newOrders[i] },
            data: { deckOrder: i + 1 },
          });
        }
        // 3. Compra drawCount do topo do DECK pra HAND
        const drawFrom = await tx.matchHand.findMany({
          where: { matchId: data.matchId, side: data.side, zone: "DECK" },
          orderBy: { deckOrder: "asc" },
          take: drawCount,
        });
        for (const d of drawFrom) {
          await tx.matchHand.update({ where: { id: d.id }, data: { zone: "HAND" } });
        }
        await logEvent(tx, data.matchId, match.currentRound, data.side, "SHUFFLE_AND_DRAW",
          { returned: returning.length, drew: drawFrom.length });
      } else if (ek === "DAMAGE") {
          if (effTargetBoardCardId) {
            const target = await tx.matchBoardCard.findUnique({
              where: { id: effTargetBoardCardId },
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
                row: effTargetRow,
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
          if (effTargetCardIdsCsv) {
            const targetIds = effTargetCardIdsCsv.split(",").filter(Boolean);
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
                  handEntryId: ht.id,
                },
              });
              await tx.matchHand.update({
                where: { id: ht.id },
                data: { zone: "BOARD" },
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
          if (effTargetBoardCardId) {
            const target = await tx.matchBoardCard.findUnique({
              where: { id: effTargetBoardCardId },
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
} else if (ek === "WEATHER_FROST" || ek === "WEATHER_FOG" || ek === "WEATHER_RAIN" || ek === "WEATHER_STORM") {
          // Carta SPECIAL/UNIT com habilidade de clima: aplica o clima em uma fileira
          const rows = weatherToRows(ek);

          for (const affectedRow of rows) {

            await tx.matchWeather.deleteMany({

              where: { matchId: data.matchId, affectedRow },

            });

            await tx.matchWeather.create({

              data: { matchId: data.matchId, weatherKey: ek, affectedRow, cardId: card.id },

            });

            await logEvent(tx, data.matchId, match.currentRound, data.side, "WEATHER", { engineKey: ek, affectedRow });

          }

          if (rows.length > 0) await persistRecomputedPower(tx, data.matchId);
        } else if (ek === "CLEAR_WEATHER") {
          await tx.matchWeather.deleteMany({ where: { matchId: data.matchId } });
          await logEvent(tx, data.matchId, match.currentRound, data.side, "CLEAR_WEATHER", {});
          await persistRecomputedPower(tx, data.matchId);
        } else if (ek === "BOOST_ROW") {
          // Inspiracao: +ev de basePower em todos aliados da fileira (effectRow OU targetRow)
          const targetRowEffect = effEffectRow ?? effTargetRow;
          const allies = await tx.matchBoardCard.findMany({
            where: { matchId: data.matchId, side: ownerSide, row: targetRowEffect, id: { not: newBoardCard?.id ?? "" } },
            include: { card: true },
          });
          await logEvent(tx, data.matchId, match.currentRound, data.side, "BOOST_ROW",
            { row: targetRowEffect, amount: ev, count: allies.length });
          await tx.matchAura.create({
            data: { matchId: data.matchId, side: ownerSide, engineKey: "BOOST_ROW", amount: ev, row: targetRowEffect },
          });
        } else if (ek === "MULTIPLY_ROW") {
          // Dadiva: dobra basePower de todos aliados da fileira
          const targetRowEffect = effEffectRow ?? effTargetRow;
          const allies = await tx.matchBoardCard.findMany({
            where: { matchId: data.matchId, side: ownerSide, row: targetRowEffect, id: { not: newBoardCard?.id ?? "" } },
            include: { card: true },
          });
          await logEvent(tx, data.matchId, match.currentRound, data.side, "MULTIPLY_ROW",
            { row: targetRowEffect, count: allies.length });
          await tx.matchAura.create({
            data: { matchId: data.matchId, side: ownerSide, engineKey: "MULTIPLY_ROW", amount: 2, row: targetRowEffect },
          });
        } else if (ek === "DESTROY_ROW") {
          // Peste: destroi todas as cartas inimigas da fileira escolhida
          const enemyRow = effEffectRow ?? effTargetRow ?? "MELEE";
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
        } else if (ek === "DESTROY_AND_DRAW" && effTargetBoardCardId) {
          // Ciclo da Vida: destroi criatura inimiga E voce compra 1 carta
          const target = await tx.matchBoardCard.findUnique({
            where: { id: effTargetBoardCardId },
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
        } else if (ek === "DAMAGE_IF" && effTargetBoardCardId) {
          // Expurgo: destroi inimigo se poder <= ev
          const target = await tx.matchBoardCard.findUnique({
            where: { id: effTargetBoardCardId },
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
          const tutorType = effTargetCardType;
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
          const immuneRow = effEffectRow ?? effTargetRow;
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
        } else if (ek === "EVOLVE_FACTION" && effTargetBoardCardId) {
          // Evolucao: destroi um aliado seu, puxa outra carta da mesma faccao do deck pro campo
          const target = await tx.matchBoardCard.findUnique({
            where: { id: effTargetBoardCardId },
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
        } else if (ek === "PERMANENCE" && effTargetBoardCardId) {
          const target = await tx.matchBoardCard.findUnique({ where: { id: effTargetBoardCardId } });
          if (target && target.matchId === data.matchId && target.side === data.side) {
            const rounds = ev > 0 ? ev : 1;
            await tx.matchBoardCard.update({
              where: { id: target.id },
              data: { permanenceCounter: rounds },
            });
            await logEvent(tx, data.matchId, match.currentRound, data.side, "PERMANENCE",
              { targetId: target.id, rounds });
          }
        } else if (ek === "PUNISHMENT") {
          const allBoard = await tx.matchBoardCard.findMany({
            where: { matchId: data.matchId },
            include: { card: true },
          });
          if (allBoard.length > 0) {
            // Pega maior basePower entre elegiveis (nao-Elite e sem Permanencia)
            const eligible = allBoard.filter((b) => !b.card.isElite && b.permanenceCounter === 0);
            const maxBase = eligible.length > 0 ? Math.max(...eligible.map((b) => b.basePower)) : -1;
            const victims = eligible.filter((b) => b.basePower === maxBase);
            for (const v of victims) {
              if (v.shielded) {
                await tx.matchBoardCard.update({ where: { id: v.id }, data: { shielded: false } });
                await logEvent(tx, data.matchId, match.currentRound, data.side, "SHIELD_CONSUMED",
                  { targetId: v.id, by: "PUNISHMENT" });
              } else {
                await triggerOnDeath(tx, data.matchId, v.id);
                await tx.matchBoardCard.delete({ where: { id: v.id } });
                await logEvent(tx, data.matchId, match.currentRound, data.side, "DESTROY",
                  { targetId: v.id, by: "PUNISHMENT" });
              }
            }
          }
        } else if (ek === "BLOOD_MOON") {
          const amount = ev > 0 ? ev : 1;
          await tx.matchAura.create({
            data: {
              matchId: data.matchId,
              side: data.side,
              engineKey: "BLOOD_MOON",
              amount,
            },
          });
          await logEvent(tx, data.matchId, match.currentRound, data.side, "BLOOD_MOON",
            { amount });
        } else if (ek === "RETURN_TO_HAND" && effTargetBoardCardId) {
          // Efigie: devolve carta do campo (aliada ou inimiga) para a mao do dono original
          const target = await tx.matchBoardCard.findUnique({
            where: { id: effTargetBoardCardId },
            include: { card: true },
          });
          if (target && target.matchId === data.matchId && !target.card.isElite && target.permanenceCounter === 0) {
            // Remove do board
            await tx.matchBoardCard.delete({ where: { id: target.id } });
            // Devolve para mao via matchHand: marca o entry original como zone HAND novamente
            if (target.handEntryId) {
              await tx.matchHand.update({
                where: { id: target.handEntryId },
                data: { zone: "HAND" },
              });
            }
            await logEvent(tx, data.matchId, match.currentRound, data.side, "RETURN_TO_HAND",
              { targetId: target.id, returnedTo: target.side });
          }
        } else if (ek === "RESURRECT_FROM_DISCARD") {
          // Ressurreicao: X UNITs aleatorias do cemiterio voltam ao campo (1a fileira permitida)
          const count = ev > 0 ? ev : 1;
          const discardPool = await tx.matchHand.findMany({
            where: { matchId: data.matchId, side: data.side, zone: "DISCARD" },
            include: { card: true },
          });
          const units = discardPool.filter((d) => d.card.cardType === "UNIT");
          const shuffled = [...units].sort(() => Math.random() - 0.5);
          const fromDiscard = shuffled.slice(0, count);
          let resurrected = 0;
          for (const entry of fromDiscard) {
            if (entry.card.cardType !== "UNIT") continue;
            const allowedRows = entry.card.rows.split(",").filter(Boolean);
            const targetRow = (allowedRows[0] ?? "MELEE") as Row;
            await tx.matchBoardCard.create({
              data: {
                matchId: data.matchId,
                side: data.side,
                cardId: entry.cardId,
                row: targetRow,
                basePower: entry.card.power,
                power: entry.card.power,
                shielded: false,
                isToken: false,
                handEntryId: entry.id,
              },
            });
            await tx.matchHand.update({ where: { id: entry.id }, data: { zone: "BOARD" } });
            resurrected++;
          }
          await logEvent(tx, data.matchId, match.currentRound, data.side, "RESURRECT_FROM_DISCARD",
            { count: resurrected });
        } else if (ek === "SUMMON_FROM_DECK") {
          // Convocacao Ritual: puxa X cartas aleatorias UNIT do deck e joga na 1a fileira permitida
          const count = ev > 0 ? ev : 1;
          const deckUnits = await tx.matchHand.findMany({
            where: { matchId: data.matchId, side: data.side, zone: "DECK" },
            include: { card: true },
          });
          const units = deckUnits.filter((d) => d.card.cardType === "UNIT");
          const shuffled = [...units].sort(() => Math.random() - 0.5);
          const picked = shuffled.slice(0, count);
          let summoned = 0;
          for (const entry of picked) {
            const allowedRows = entry.card.rows.split(",").filter(Boolean);
            const targetRow = (allowedRows[0] ?? "MELEE") as Row;
            await tx.matchBoardCard.create({
              data: {
                matchId: data.matchId,
                side: data.side,
                cardId: entry.cardId,
                row: targetRow,
                basePower: entry.card.power,
                power: entry.card.power,
                shielded: false,
                isToken: false,
                handEntryId: entry.id,
              },
            });
            await tx.matchHand.update({ where: { id: entry.id }, data: { zone: "BOARD" } });
            summoned++;
          }
          await logEvent(tx, data.matchId, match.currentRound, data.side, "SUMMON_FROM_DECK",
            { count: summoned });
        } else if (ek === "CONSUME_ALLY" && effTargetBoardCardId && newBoardCard) {
          // Consumir: destroi uma aliada escolhida e absorve seu basePower
          const target = await tx.matchBoardCard.findUnique({
            where: { id: effTargetBoardCardId },
            include: { card: true },
          });
          if (target && target.matchId === data.matchId && target.side === ownerSide && target.id !== newBoardCard.id && !target.card.isElite && target.permanenceCounter === 0) {
            const absorbed = target.basePower;
            await triggerOnDeath(tx, data.matchId, target.id);
            await tx.matchBoardCard.delete({ where: { id: target.id } });
            await tx.matchBoardCard.update({
              where: { id: newBoardCard.id },
              data: { basePower: newBoardCard.basePower + absorbed },
            });
            await logEvent(tx, data.matchId, match.currentRound, data.side, "CONSUME_ALLY",
              { consumedId: target.id, absorbedPower: absorbed, consumerId: newBoardCard.id });
          }
        } else if (ek === "SUMMON_TO_HAND_BY_NAME") {
          // Recuperacao: puxa carta especifica do universo para a mao
          if (effTargetCardIdsCsv) {
            const targetIds = effTargetCardIdsCsv.split(",").filter(Boolean);
            for (const cardId of targetIds) {
              const cardExists = await tx.card.findUnique({ where: { id: cardId } });
              if (!cardExists) continue;
              const maxOrder = await tx.matchHand.aggregate({
                where: { matchId: data.matchId, side: ownerSide },
                _max: { deckOrder: true },
              });
              await tx.matchHand.create({
                data: {
                  matchId: data.matchId,
                  side: ownerSide,
                  cardId,
                  zone: "HAND",
                  deckOrder: (maxOrder._max.deckOrder ?? 0) + 1,
                },
              });
            }
            await logEvent(tx, data.matchId, match.currentRound, data.side, "SUMMON_TO_HAND_BY_NAME",
              { count: targetIds.length });
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
    } else if (ek === "WEATHER_FROST" || ek === "WEATHER_FOG" || ek === "WEATHER_RAIN" || ek === "WEATHER_STORM") {
        // Lider com habilidade de clima: aplica em uma fileira
        const rows = weatherToRows(ek);

        for (const affectedRow of rows) {

          await tx.matchWeather.deleteMany({

            where: { matchId: data.matchId, affectedRow },

          });

          await tx.matchWeather.create({

            data: { matchId: data.matchId, weatherKey: ek, affectedRow, cardId: leaderCard.id },

          });

          await logEvent(tx, data.matchId, match.currentRound, data.side, "WEATHER", { engineKey: ek, affectedRow });

        }

        if (rows.length > 0) await persistRecomputedPower(tx, data.matchId);
      } else if (ek === "CLEAR_WEATHER") {
        await tx.matchWeather.deleteMany({ where: { matchId: data.matchId } });
        await logEvent(tx, data.matchId, match.currentRound, data.side, "CLEAR_WEATHER", {});
        await persistRecomputedPower(tx, data.matchId);
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

const boardCards = await tx.matchBoardCard.findMany({
    where: { matchId },
    include: { card: true },
  });
  const survivors = boardCards.filter((b) =>
    (b.card.cardType === "LEADER" && b.card.leaderMode === "PERSISTENT") ||
    b.permanenceCounter > 0
  );
  const survivorIds = new Set(survivors.map((s) => s.id));
  const survivorHandIds = new Set(survivors.map((s) => s.handEntryId).filter((id): id is string => !!id));
  const idsToDelete = boardCards.filter((b) => !survivorIds.has(b.id)).map((b) => b.id);

  await tx.matchBoardCard.deleteMany({ where: { id: { in: idsToDelete } } });

  // Decrementa permanenceCounter dos sobreviventes
  for (const s of survivors) {
    if (s.permanenceCounter > 0) {
      await tx.matchBoardCard.update({
        where: { id: s.id },
        data: { permanenceCounter: s.permanenceCounter - 1 },
      });
    }
  }

  // Cartas no campo viram cemiterio, exceto sobreviventes
  await tx.matchHand.updateMany({
    where: {
      matchId,
      zone: "BOARD",
      NOT: { id: { in: Array.from(survivorHandIds) } },
    },
    data: { zone: "DISCARD" },
  });
  await tx.matchWeather.deleteMany({ where: { matchId } });
  await tx.matchRowImmunity.deleteMany({ where: { matchId } });
  await tx.matchAura.deleteMany({ where: { matchId } });

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
// Vinganca pendente: jogador clica numa carta inimiga para aplicar o dano
export async function triggerRevengeAction(data: { matchId: string; side: Side; targetBoardCardId: string }) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Voce precisa estar logado.");
  const user = await prisma.user.findUnique({ where: { username: session.user.name } });
  if (!user) throw new Error("Usuario nao encontrado.");

  await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: data.matchId },
      include: { players: true },
    });
    if (!match) throw new Error("Partida nao encontrada.");
    const player = match.players.find((p) => p.userId === user.id && p.side === data.side);
    if (!player) throw new Error("Voce nao esta nessa partida.");

    // Pega a primeira vinganca pendente desse lado (FIFO)
    const pending = await tx.pendingRevenge.findFirst({
      where: { matchId: data.matchId, side: data.side },
      orderBy: { createdAt: "asc" },
    });
    if (!pending) throw new Error("Nao ha vinganca pendente.");

    const target = await tx.matchBoardCard.findUnique({
      where: { id: data.targetBoardCardId },
      include: { card: true },
    });
    if (!target || target.matchId !== data.matchId) throw new Error("Alvo invalido.");
    if (target.side === data.side) throw new Error("Voce nao pode mirar uma aliada.");
    if (target.card.isElite) throw new Error("Cartas Elite sao imunes.");
    if (target.permanenceCounter > 0) throw new Error("Carta com Permanencia e imune.");

    if (target.shielded) {
      await tx.matchBoardCard.update({ where: { id: target.id }, data: { shielded: false } });
      await logEvent(tx, data.matchId, match.currentRound, data.side, "SHIELD_CONSUMED", { targetId: target.id, by: "REVENGE" });
    } else {
      const newBase = target.basePower - pending.damage;
      if (newBase <= 0) {
        await triggerOnDeath(tx, data.matchId, target.id);
        await tx.matchBoardCard.delete({ where: { id: target.id } });
        await logEvent(tx, data.matchId, match.currentRound, data.side, "REVENGE_DESTROY",
          { targetId: target.id, damage: pending.damage, source: pending.sourceName });
      } else {
        await tx.matchBoardCard.update({ where: { id: target.id }, data: { basePower: newBase } });
        await logEvent(tx, data.matchId, match.currentRound, data.side, "REVENGE_DAMAGE",
          { targetId: target.id, damage: pending.damage, source: pending.sourceName });
      }
    }

    await tx.pendingRevenge.delete({ where: { id: pending.id } });
    await persistRecomputedPower(tx, data.matchId);
  });
}
