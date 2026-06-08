// lib/lobby-actions.ts
// Server actions de lobby/multiplayer (criar, entrar, escolher deck, cancelar).

"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { shuffle, redrawsForRound, type Side } from "./match-engine";
import { notifyMatchChange } from "./match-events";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// 1. CRIAR LOBBY (sem deck, sala vazia esperando)
// ─────────────────────────────────────────────

export async function createLobbyAction(): Promise<{ matchId: string }> {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Você precisa estar logado.");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) throw new Error("Usuário não encontrado.");

  // Limite simples: 1 lobby aberto por jogador por vez (evita poluição)
  const existingOpen = await prisma.match.findFirst({
    where: {
      mode: "ONLINE",
      lobbyOpen: true,
      creatorUserId: user.id,
    },
  });
  if (existingOpen) {
    throw new Error("Você já tem um lobby aberto. Cancele ele antes de criar outro.");
  }

  const match = await prisma.match.create({
    data: {
      mode: "ONLINE",
      status: "LOBBY",
      lobbyOpen: true,
      creatorUserId: user.id,
    },
  });

  revalidatePath("/lobby");
  return { matchId: match.id };
}

// ─────────────────────────────────────────────
// 2. CANCELAR LOBBY (só o criador, só se ninguém entrou)
// ─────────────────────────────────────────────

export async function cancelLobbyAction(matchId: string) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Você precisa estar logado.");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) throw new Error("Usuário não encontrado.");

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { players: true },
  });
  if (!match) throw new Error("Partida não encontrada.");
  if (match.status !== "LOBBY") throw new Error("Esta partida não está mais em lobby.");
  if (match.creatorUserId !== user.id) throw new Error("Só o criador pode cancelar.");
  if (match.players.length > 0) {
    throw new Error("Já existem jogadores conectados. Cancele a partida na sala.");
  }

  await prisma.match.delete({ where: { id: matchId } });

  revalidatePath("/lobby");
  notifyMatchChange(matchId);
}

// ─────────────────────────────────────────────
// 3. ENTRAR EM LOBBY (escolhendo o deck)
// ─────────────────────────────────────────────

export async function joinLobbyAction(data: {
  matchId: string;
  deckId: string;
}) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Você precisa estar logado.");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) throw new Error("Usuário não encontrado.");

  const [match, deck, settings] = await Promise.all([
    prisma.match.findUnique({
      where: { id: data.matchId },
      include: { players: true },
    }),
    prisma.deck.findUnique({
      where: { id: data.deckId },
      include: { leader: true, cards: true },
    }),
    prisma.gameSettings.upsert({
      where: { id: "singleton" }, update: {}, create: { id: "singleton" },
    }),
  ]);

  if (!match) throw new Error("Partida não encontrada.");
  if (match.status !== "LOBBY") throw new Error("Esta partida não está mais aberta.");
  if (!deck) throw new Error("Deck não encontrado.");
  if (deck.userId !== user.id) throw new Error("Esse deck não é seu.");
  if (!deck.leader) throw new Error("Deck sem líder não pode ser usado em partida.");
  if (deck.cards.length < settings.minCardsPerDeck) {
    throw new Error(`Deck tem ${deck.cards.length} cartas (mín ${settings.minCardsPerDeck}).`);
  }
  if (deck.cards.length > settings.maxCardsPerDeck) {
    throw new Error(`Deck tem ${deck.cards.length} cartas (máx ${settings.maxCardsPerDeck}).`);
  }

  // Verifica se o jogador já está nesta partida
  const alreadyIn = match.players.find((p) => p.userId === user.id);
  if (alreadyIn) {
    throw new Error("Você já está nesta partida.");
  }

  // Verifica vagas
  if (match.players.length >= 2) {
    throw new Error("Esta partida já está cheia.");
  }

  // Determina lado: sorteio aleatório se for o primeiro a entrar,
  // ou o lado oposto ao que já está ocupado se for o segundo.
  let side: Side;
  if (match.players.length === 0) {
    side = Math.random() < 0.5 ? "A" : "B";
  } else {
    const taken = match.players[0].side;
    side = taken === "A" ? "B" : "A";
  }

  await prisma.matchPlayer.create({
    data: {
      matchId: match.id,
      side,
      userId: user.id,
      deckId: deck.id,
      redrawsLeft: redrawsForRound(1),
      deckCardCount: deck.cards.length,
    },
  });

  // Se com este jogador a partida ficou com 2 lados → começa partida
  const totalNow = match.players.length + 1;
  if (totalNow === 2) {
    await startOnlineMatch(match.id);
  }

  revalidatePath("/lobby");
  revalidatePath(`/partidas/${match.id}`);
  notifyMatchChange(match.Id);
}

// ─────────────────────────────────────────────
// 4. INICIAR PARTIDA ONLINE (interna, chamada quando 2 players entraram)
// ─────────────────────────────────────────────

async function startOnlineMatch(matchId: string) {
  // Carrega cartas de cada deck pra embaralhar e distribuir mãos
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      players: {
        include: { deck: { include: { cards: true, leader: true } } },
      },
    },
  });
  if (!match) throw new Error("Partida não encontrada.");
  if (match.players.length !== 2) throw new Error("Partida sem 2 jogadores.");

  // Sorteia quem começa a 1ª ronda
  const startSide: Side = Math.random() < 0.5 ? "A" : "B";

  await prisma.$transaction(async (tx) => {
    for (const p of match.players) {
      // Embaralha o deck e cria entradas MatchHand
      const shuffled = shuffle(p.deck.cards);
      for (let i = 0; i < shuffled.length; i++) {
        const zone = i < 10 ? "HAND" : "DECK";
        await tx.matchHand.create({
          data: {
            matchId: match.id,
            side: p.side,
            cardId: shuffled[i].cardId,
            zone,
            deckOrder: i,
          },
        });
      }

      // Líder PERSISTENT vai pra mesa
      if (p.deck.leader) {
        const leaderCard = await tx.card.findUnique({ where: { id: p.deck.leader.cardId } });
        if (leaderCard && leaderCard.leaderMode === "PERSISTENT") {
          const rows = leaderCard.rows.split(",").filter(Boolean);
          const targetRow = (rows[0] ?? "MELEE") as "MELEE" | "RANGED" | "SIEGE";
          await tx.matchBoardCard.create({
            data: {
              matchId: match.id,
              side: p.side,
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

    await tx.match.update({
      where: { id: matchId },
      data: {
        status: "REDRAW",
        lobbyOpen: false,
        currentTurnSide: startSide,
        startsRoundSide: startSide,
      },
    });

    await tx.matchEvent.create({
      data: {
        matchId,
        round: 1,
        type: "MATCH_CREATED",
        payload: JSON.stringify({ startSide, mode: "ONLINE" }),
      },
    });
  });
}

// ─────────────────────────────────────────────
// 5. SAIR DO LOBBY (jogador que entrou desiste antes da partida começar)
// ─────────────────────────────────────────────

export async function leaveLobbyAction(matchId: string) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Você precisa estar logado.");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) throw new Error("Usuário não encontrado.");

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { players: true },
  });
  if (!match) throw new Error("Partida não encontrada.");
  if (match.status !== "LOBBY") {
    throw new Error("Não dá pra sair: a partida já começou.");
  }

  const myPlayer = match.players.find((p) => p.userId === user.id);
  if (!myPlayer) throw new Error("Você não está nesta partida.");

  await prisma.matchPlayer.delete({ where: { id: myPlayer.id } });

  revalidatePath("/lobby");
  revalidatePath(`/partidas/${matchId}`);
  notifyMatchChange(matchId);
}