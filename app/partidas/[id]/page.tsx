export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { MatchTable } from "./_components/MatchTable";
import { LobbyWaitingRoom } from "./_components/LobbyWaitingRoom";

const prisma = new PrismaClient();

export default async function PartidaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      players: {
        include: {
          user: { select: { username: true } },
          deck: {
            include: {
              faction: true,
              leader: {
                include: { card: { include: { ability: true, faction: true } } },
              },
            },
          },
        },
      },
      hands: {
        include: { card: { include: { faction: true, ability: true } } },
      },
      board: {
        include: { card: { include: { faction: true, ability: true } } },
      },
      weather: {
        include: { card: { include: { faction: true, ability: true } } },
      },
      immunities: true,
      auras: true,
      pendingRevenges: true,
      events: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!match) notFound();

  if (match.status === "LOBBY") {
    return <LobbyWaitingRoom matchId={match.id} match={match} sessionUserName={session.user.name} />;
  }
  // Cartas SPECIAL/WEATHER jogadas na ronda atual (visual no painel)
  const currentRound = match.currentRound;
  const playedCardIds = new Set<string>();
  const playedBySide: Record<"A" | "B", Array<{ cardId: string; side: "A" | "B" }>> = { A: [], B: [] };
  for (const e of match.events) {
    if (e.round !== currentRound) continue;
    if (e.type !== "PLAY_CARD" && e.type !== "WEATHER") continue;
    let payload: { cardId?: string } | null = null;
    try {
      payload = typeof e.payload === "string" ? JSON.parse(e.payload) : (e.payload as { cardId?: string });
    } catch {
      payload = null;
    }
    if (!payload?.cardId) continue;
    const side = (e.side ?? "A") as "A" | "B";
    playedBySide[side].push({ cardId: payload.cardId, side });
    playedCardIds.add(payload.cardId);
  }
  // Busca dados das cartas SPECIAL/WEATHER jogadas
  const playedCards = playedCardIds.size > 0
    ? await prisma.card.findMany({
        where: { id: { in: Array.from(playedCardIds) }, cardType: { in: ["SPECIAL", "WEATHER"] } },
        include: { faction: true, ability: true },
      })
    : [];
  const cardById = new Map(playedCards.map((c) => [c.id, c]));
  function cardsForSide(side: "A" | "B") {
    return playedBySide[side]
      .map(({ cardId }) => cardById.get(cardId))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((c) => ({
        cardId: c.id,
        name: c.name,
        power: c.power,
        rarity: c.rarity,
        cardType: c.cardType,
        imageUrl: c.imageUrl,
        frameUrl: c.frameUrl,
        faction: { name: c.faction.name, color: c.faction.color },
        ability: c.ability ? { name: c.ability.name, description: c.ability.description } : null,
      }));
  }
  const pA = match.players.find((p) => p.side === "A");
  const pB = match.players.find((p) => p.side === "B");
  if (!pA || !pB) notFound();

// Descobre qual lado o usuário logado está jogando (relevante em ONLINE).
  // Em HOTSEAT, viewerSide = null e ambos os lados são visíveis.
  const viewerUser = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  const viewerSide: "A" | "B" | null =
    match.mode === "ONLINE" && viewerUser
      ? (pA.userId === viewerUser.id ? "A" : pB.userId === viewerUser.id ? "B" : null)
      : null;

  // Em ONLINE, espectadores (nem A nem B) não veem a partida.
  if (match.mode === "ONLINE" && viewerSide === null) {
    redirect("/partidas");
  }
  
  return (
    <main className="flex-1 w-full">
      <div className="flex items-center justify-between mb-4">
        <Link href="/partidas" className="text-sm text-zinc-500 hover:text-amber-200">
          ← Partidas
        </Link>
        <p className="text-xs text-zinc-500 font-mono">
          {match.status} · Ronda {match.currentRound}
        </p>
      </div>

      <MatchTable
        matchId={match.id}
        status={match.status}
        round={match.currentRound}
        currentTurnSide={match.currentTurnSide as "A" | "B" | null}
        players={{
          A: {
            username: pA.user.username,
            roundsWon: pA.roundsWon,
            hasPassed: pA.hasPassed,
            leaderUsed: pA.leaderUsed,
            redrawsLeft: pA.redrawsLeft,
            handCount: match.hands.filter((h) => h.side === "A" && h.zone === "HAND").length,
            discardCount: match.hands.filter((h) => h.side === "A" && h.zone === "DISCARD").length,
            deckRealCount: match.hands.filter((h) => h.side === "A" && h.zone === "DECK").length,
            deck: {
              name: pA.deck.name,
              faction: { name: pA.deck.faction.name, color: pA.deck.faction.color },
              leader: pA.deck.leader ? {
                cardId: pA.deck.leader.cardId,
                name: pA.deck.leader.card.name,
                imageUrl: pA.deck.leader.card.imageUrl,
                frameUrl: pA.deck.leader.card.frameUrl,
                leaderMode: pA.deck.leader.card.leaderMode,
                power: pA.deck.leader.card.power,
                rarity: pA.deck.leader.card.rarity,
                cardType: pA.deck.leader.card.cardType,
                ability: pA.deck.leader.card.ability ? {
                  name: pA.deck.leader.card.ability.name,
                  description: pA.deck.leader.card.ability.description,
                  engineKey: pA.deck.leader.card.ability.engineKey,
                  targetCount: pA.deck.leader.card.ability.targetCount,
                } : null,
              } : null,
            },
          },
          B: {
            username: pB.user.username,
            roundsWon: pB.roundsWon,
            hasPassed: pB.hasPassed,
            leaderUsed: pB.leaderUsed,
            redrawsLeft: pB.redrawsLeft,
            handCount: match.hands.filter((h) => h.side === "B" && h.zone === "HAND").length,
            discardCount: match.hands.filter((h) => h.side === "B" && h.zone === "DISCARD").length,
            deckRealCount: match.hands.filter((h) => h.side === "B" && h.zone === "DECK").length,
            deck: {
              name: pB.deck.name,
              faction: { name: pB.deck.faction.name, color: pB.deck.faction.color },
              leader: pB.deck.leader ? {
                cardId: pB.deck.leader.cardId,
                name: pB.deck.leader.card.name,
                imageUrl: pB.deck.leader.card.imageUrl,
                frameUrl: pB.deck.leader.card.frameUrl,
                leaderMode: pB.deck.leader.card.leaderMode,
                power: pB.deck.leader.card.power,
                rarity: pB.deck.leader.card.rarity,
                cardType: pB.deck.leader.card.cardType,
                ability: pB.deck.leader.card.ability ? {
                  name: pB.deck.leader.card.ability.name,
                  description: pB.deck.leader.card.ability.description,
                  engineKey: pB.deck.leader.card.ability.engineKey,
                  targetCount: pB.deck.leader.card.ability.targetCount,
                } : null,
              } : null,
            },
          },
        }}
        board={match.board.map((b) => ({
          boardId: b.id,
          cardId: b.cardId,
          side: b.side as "A" | "B",
          row: b.row as "MELEE" | "RANGED" | "SIEGE",
          basePower: b.basePower,
          power: b.power,
          shielded: b.shielded,
          isToken: b.isToken,
          name: b.card.name,
          rarity: b.card.rarity,
          cardType: b.card.cardType,
          isElite: b.card.isElite,
          imageUrl: b.card.imageUrl,
          frameUrl: b.card.frameUrl,
          faction: { name: b.card.faction.name, color: b.card.faction.color },
          ability: b.card.ability ? { name: b.card.ability.name, description: b.card.ability.description } : null,
        }))}
        hands={{
          A: (match.mode === "HOTSEAT" || viewerSide === "A")
            ? match.hands.filter((h) => h.side === "A" && h.zone === "HAND").map((h) => ({
                handId: h.id,
                cardId: h.cardId,
                name: h.card.name,
                power: h.card.power,
                rows: h.card.rows,
                rarity: h.card.rarity,
                cardType: h.card.cardType,
                isElite: h.card.isElite,
                imageUrl: h.card.imageUrl,
                frameUrl: h.card.frameUrl,
                faction: { name: h.card.faction.name, color: h.card.faction.color },
                ability: h.card.ability ? {
                  name: h.card.ability.name,
                  description: h.card.ability.description,
                  engineKey: h.card.ability.engineKey,
                  engineValue: h.card.ability.engineValue,
                  targetCount: h.card.ability.targetCount,
                  secondaryEngineKey: h.card.ability.secondaryEngineKey,
                  secondaryEngineValue: h.card.ability.secondaryEngineValue,
                  secondaryTargetCount: h.card.ability.secondaryTargetCount,
                } : null,
              }))
            : [],
          B: (match.mode === "HOTSEAT" || viewerSide === "B")
            ? match.hands.filter((h) => h.side === "B" && h.zone === "HAND").map((h) => ({
                handId: h.id,
                cardId: h.cardId,
                name: h.card.name,
                power: h.card.power,
                rows: h.card.rows,
                rarity: h.card.rarity,
                cardType: h.card.cardType,
                isElite: h.card.isElite,
                imageUrl: h.card.imageUrl,
                frameUrl: h.card.frameUrl,
                faction: { name: h.card.faction.name, color: h.card.faction.color },
                ability: h.card.ability ? {
                  name: h.card.ability.name,
                  description: h.card.ability.description,
                  engineKey: h.card.ability.engineKey,
                  engineValue: h.card.ability.engineValue,
                  targetCount: h.card.ability.targetCount,
                  secondaryEngineKey: h.card.ability.secondaryEngineKey,
                  secondaryEngineValue: h.card.ability.secondaryEngineValue,
                  secondaryTargetCount: h.card.ability.secondaryTargetCount,
                } : null,
              }))
            : [],
        }}
        mode={match.mode}
        viewerSide={viewerSide}
        currentRoundEvents={match.events
          .filter((e) => e.round === match.currentRound)
          .map((e) => ({
            id: e.id,
            type: e.type,
            side: e.side as "A" | "B" | null,
            payload: e.payload,
            createdAt: e.createdAt.toISOString(),
          }))}
        weather={match.weather.map((w) => ({
          weatherKey: w.weatherKey,
          affectedRow: w.affectedRow as "MELEE" | "RANGED" | "SIEGE",
          cardName: w.card.name,
        }))}
        pausedBy={match.pausedBy as "A" | "B" | null}
        drawOfferedBy={match.drawOfferedBy as "A" | "B" | null}
        winnerSide={match.winnerSide as "A" | "B" | "DRAW" | null}
        lastDiscarded={{
          A: (() => {
            const d = match.hands.find((h) => h.side === "A" && h.zone === "DISCARD");
            return d ? { name: d.card.name, power: d.card.power, rarity: d.card.rarity, cardType: d.card.cardType, imageUrl: d.card.imageUrl, frameUrl: d.card.frameUrl, faction: { name: d.card.faction.name, color: d.card.faction.color }, ability: d.card.ability ? { name: d.card.ability.name, description: d.card.ability.description } : null } : null;
          })(),
          B: (() => {
            const d = match.hands.find((h) => h.side === "B" && h.zone === "DISCARD");
            return d ? { name: d.card.name, power: d.card.power, rarity: d.card.rarity, cardType: d.card.cardType, imageUrl: d.card.imageUrl, frameUrl: d.card.frameUrl, faction: { name: d.card.faction.name, color: d.card.faction.color }, ability: d.card.ability ? { name: d.card.ability.name, description: d.card.ability.description } : null } : null;
          })(),
        }}
        discards={{
          A: match.hands.filter((h) => h.side === "A" && h.zone === "DISCARD" && h.card.cardType === "UNIT").map((h) => ({
            handId: h.id,
            name: h.card.name,
            power: h.card.power,
            imageUrl: h.card.imageUrl,
            frameUrl: h.card.frameUrl,
            rarity: h.card.rarity,
            faction: { name: h.card.faction.name, color: h.card.faction.color },
          })),
          B: match.hands.filter((h) => h.side === "B" && h.zone === "DISCARD" && h.card.cardType === "UNIT").map((h) => ({
            handId: h.id,
            name: h.card.name,
            power: h.card.power,
            imageUrl: h.card.imageUrl,
            frameUrl: h.card.frameUrl,
            rarity: h.card.rarity,
            faction: { name: h.card.faction.name, color: h.card.faction.color },
          })),
        }}
        playedSpecials={{
          A: cardsForSide("A"),
          B: cardsForSide("B"),
        }}
        sideEffects={{
          A: {
            immunities: match.immunities.filter((i) => i.side === "A" && i.turnsLeft > 0).map((i) => ({ row: i.row as "MELEE" | "RANGED" | "SIEGE", turnsLeft: i.turnsLeft })),
            auras: match.auras.filter((a) => a.side === "A").map((a) => ({ engineKey: a.engineKey, amount: a.amount, row: a.row as "MELEE" | "RANGED" | "SIEGE" | null })),
            weathers: match.weather.filter((w) => match.board.some((b) => b.side === "A" && b.row === w.affectedRow)).map((w) => ({ weatherKey: w.weatherKey, affectedRow: w.affectedRow as "MELEE" | "RANGED" | "SIEGE" })),
          },
          B: {
            immunities: match.immunities.filter((i) => i.side === "B" && i.turnsLeft > 0).map((i) => ({ row: i.row as "MELEE" | "RANGED" | "SIEGE", turnsLeft: i.turnsLeft })),
            auras: match.auras.filter((a) => a.side === "B").map((a) => ({ engineKey: a.engineKey, amount: a.amount, row: a.row as "MELEE" | "RANGED" | "SIEGE" | null })),
            weathers: match.weather.filter((w) => match.board.some((b) => b.side === "B" && b.row === w.affectedRow)).map((w) => ({ weatherKey: w.weatherKey, affectedRow: w.affectedRow as "MELEE" | "RANGED" | "SIEGE" })),
          },
        }}
        pendingRevenges={{
          A: match.pendingRevenges.filter((r) => r.side === "A").map((r) => ({ id: r.id, damage: r.damage, sourceName: r.sourceName })),
          B: match.pendingRevenges.filter((r) => r.side === "B").map((r) => ({ id: r.id, damage: r.damage, sourceName: r.sourceName })),
        }}
      />
    </main>
  );
}