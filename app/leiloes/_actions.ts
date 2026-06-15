"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createNotification, broadcastNotification } from "@/lib/notifications";

const prisma = new PrismaClient();

const ALLOWED_DURATIONS = [60, 180, 300]; // 1, 3, 5 minutos

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Voce precisa estar logado.");
  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true, role: true },
  });
  if (!user) throw new Error("Usuario nao encontrado.");
  if (user.role !== "ADMIN") throw new Error("Apenas administradores podem realizar esta acao.");
  return user;
}

async function requireUser() {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Voce precisa estar logado.");
  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true, role: true, coins: true },
  });
  if (!user) throw new Error("Usuario nao encontrado.");
  return user;
}

// Criar leilao (admin)
export async function createAuctionAction(data: {
  cardId: string;
  quantity: number;
  minBid: number;
  durationSeconds: number;
}) {
  await requireAdmin();

  if (!ALLOWED_DURATIONS.includes(data.durationSeconds)) {
    throw new Error("Duracao invalida. Use 60, 180 ou 300 segundos.");
  }
  if (data.quantity < 1) throw new Error("Quantidade invalida.");
  if (data.minBid < 0) throw new Error("Lance minimo invalido.");

  const card = await prisma.card.findUnique({ where: { id: data.cardId } });
  if (!card) throw new Error("Carta nao encontrada.");

  const now = new Date();
  const endsAt = new Date(now.getTime() + data.durationSeconds * 1000);

  const created = await prisma.auction.create({
    data: {
      cardId: data.cardId,
      quantity: data.quantity,
      minBid: data.minBid,
      durationSeconds: data.durationSeconds,
      startedAt: now,
      endsAt,
      status: "ACTIVE",
    },
  });

  // Broadcast para todos
  await broadcastNotification({
    type: "AUCTION_NEW",
    title: "Novo leilao iniciado!",
    message: `${card.name} esta em leilao. Termina em ${Math.floor(data.durationSeconds / 60)}min.`,
    linkUrl: `/leiloes`,
  });

  revalidatePath("/leiloes");
  revalidatePath("/admin/leiloes");
}

// Cancelar leilao (admin, devolve nada por que carta vem do estoque do sistema)
export async function cancelAuctionAction(auctionId: string) {
  await requireAdmin();

  await prisma.auction.update({
    where: { id: auctionId },
    data: { status: "CANCELLED", finishedAt: new Date() },
  });

  revalidatePath("/leiloes");
  revalidatePath("/admin/leiloes");
}

// Dar lance (jogador comum)
export async function placeBidAction(auctionId: string, amount: number) {
  const user = await requireUser();

  if (amount < 0) throw new Error("Lance invalido.");
  if (user.coins < amount) throw new Error("Voce nao tem moedas suficientes para esse lance.");

  await prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({ where: { id: auctionId } });
    if (!auction) throw new Error("Leilao nao encontrado.");
    if (auction.status !== "ACTIVE") throw new Error("Leilao nao esta ativo.");
    if (auction.endsAt.getTime() < Date.now()) throw new Error("Leilao ja expirou.");
    if (amount < auction.minBid) throw new Error(`Lance deve ser pelo menos ${auction.minBid}.`);

    // Verifica se ja tem lance (unique)
    const existing = await tx.auctionBid.findUnique({
      where: { auctionId_bidderUserId: { auctionId, bidderUserId: user.id } },
    });
    if (existing) throw new Error("Voce ja deu um lance neste leilao.");

    await tx.auctionBid.create({
      data: { auctionId, bidderUserId: user.id, amount },
    });
  });

  revalidatePath("/leiloes");
  revalidatePath(`/leiloes/${auctionId}`);
}

// Encerrar leilao (admin)
export async function finishAuctionAction(auctionId: string) {
  await requireAdmin();

  await prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({
      where: { id: auctionId },
      include: { bids: { orderBy: { amount: "desc" } } },
    });
    if (!auction) throw new Error("Leilao nao encontrado.");
    if (auction.status !== "ACTIVE") throw new Error("Leilao ja foi encerrado.");

    if (auction.bids.length === 0) {
      // Sem lances - cancela
      await tx.auction.update({
        where: { id: auctionId },
        data: { status: "FINISHED", finishedAt: new Date() },
      });
      return;
    }

    // Encontra o maior lance que ainda tem moedas suficientes
    let winner: { bidderUserId: string; amount: number } | null = null;
    for (const bid of auction.bids) {
      const u = await tx.user.findUnique({ where: { id: bid.bidderUserId }, select: { coins: true } });
      if (u && u.coins >= bid.amount) {
        winner = { bidderUserId: bid.bidderUserId, amount: bid.amount };
        break;
      }
    }

    if (!winner) {
      // Nenhum maior tem moedas - encerra sem vencedor
      await tx.auction.update({
        where: { id: auctionId },
        data: { status: "FINISHED", finishedAt: new Date() },
      });
      return;
    }

    // Debita vencedor (queima as moedas - nao vao pra ninguem)
    await tx.user.update({
      where: { id: winner.bidderUserId },
      data: { coins: { decrement: winner.amount } },
    });

    // Carta vai pra colecao do vencedor
    await tx.userCollection.upsert({
      where: { userId_cardId: { userId: winner.bidderUserId, cardId: auction.cardId } },
      update: { quantity: { increment: auction.quantity } },
      create: { userId: winner.bidderUserId, cardId: auction.cardId, quantity: auction.quantity },
    });

    // Registra transacao
    await tx.transaction.create({
      data: {
        userId: winner.bidderUserId,
        amount: -winner.amount,
        reason: "AUCTION_WIN",
        note: JSON.stringify({ auctionId, cardId: auction.cardId, quantity: auction.quantity }),
      },
    });

    await tx.auction.update({
      where: { id: auctionId },
      data: {
        status: "FINISHED",
        finishedAt: new Date(),
        winnerUserId: winner.bidderUserId,
        winningBid: winner.amount,
      },
    });
  });

  // Notificar vencedor + perdedores (fora da transacao)
  const finalAuction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { card: { select: { name: true } }, bids: { select: { bidderUserId: true } } },
  });
  if (finalAuction && finalAuction.winnerUserId) {
    await createNotification({
      userId: finalAuction.winnerUserId,
      type: "AUCTION_WON",
      title: "Voce venceu o leilao!",
      message: `Voce ganhou ${finalAuction.quantity}x ${finalAuction.card.name} por ${finalAuction.winningBid} moedas.`,
      linkUrl: "/colecao",
    });
    for (const bid of finalAuction.bids) {
      if (bid.bidderUserId !== finalAuction.winnerUserId) {
        await createNotification({
          userId: bid.bidderUserId,
          type: "AUCTION_LOST",
          title: "Leilao encerrado",
          message: `O leilao de ${finalAuction.card.name} terminou. Voce nao venceu desta vez.`,
          linkUrl: "/leiloes",
        });
      }
    }
  }

  revalidatePath("/leiloes");
  revalidatePath(`/leiloes/${auctionId}`);
  revalidatePath("/admin/leiloes");
}