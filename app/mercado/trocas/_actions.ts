"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

interface CardEntry {
  cardId: string;
  quantity: number;
}

// Criar oferta de troca
export async function createTradeOfferAction(data: {
  offered: CardEntry[];      // cartas que o criador da
  demanded: CardEntry[];     // cartas que quer em troca
  coinsOffered: number;
  coinsDemanded: number;
  targetUserId: string | null;  // null = publica
  note: string | null;
}) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Voce precisa estar logado.");

  if (data.offered.length === 0 && data.coinsOffered === 0) {
    throw new Error("Voce precisa oferecer ao menos uma carta ou moedas.");
  }
  if (data.demanded.length === 0 && data.coinsDemanded === 0) {
    throw new Error("Voce precisa pedir ao menos uma carta ou moedas.");
  }
  if (data.coinsOffered < 0 || data.coinsDemanded < 0) {
    throw new Error("Valores de moedas invalidos.");
  }

  const creator = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true, coins: true },
  });
  if (!creator) throw new Error("Usuario nao encontrado.");

  if (data.targetUserId === creator.id) {
    throw new Error("Voce nao pode oferecer troca para si mesmo.");
  }

  // Valida que tem as moedas oferecidas
  if (data.coinsOffered > creator.coins) {
    throw new Error("Voce nao tem moedas suficientes para oferecer.");
  }

  await prisma.$transaction(async (tx) => {
    // Validar e debitar cartas oferecidas
    for (const entry of data.offered) {
      if (entry.quantity < 1) throw new Error("Quantidade invalida.");
      const col = await tx.userCollection.findUnique({
        where: { userId_cardId: { userId: creator.id, cardId: entry.cardId } },
      });
      if (!col || col.quantity < entry.quantity) {
        const card = await tx.card.findUnique({ where: { id: entry.cardId }, select: { name: true } });
        throw new Error(`Voce nao tem copias suficientes de ${card?.name ?? entry.cardId}.`);
      }
      await tx.userCollection.update({
        where: { id: col.id },
        data: { quantity: { decrement: entry.quantity } },
      });
    }

    // Debitar moedas oferecidas
    if (data.coinsOffered > 0) {
      await tx.user.update({
        where: { id: creator.id },
        data: { coins: { decrement: data.coinsOffered } },
      });
    }

    // Criar oferta
    await tx.tradeOffer.create({
      data: {
        creatorUserId: creator.id,
        targetUserId: data.targetUserId,
        coinsOffered: data.coinsOffered,
        coinsDemanded: data.coinsDemanded,
        note: data.note ?? null,
        status: "PENDING",
        offered: { create: data.offered.map((o) => ({ cardId: o.cardId, quantity: o.quantity })) },
        demanded: { create: data.demanded.map((o) => ({ cardId: o.cardId, quantity: o.quantity })) },
      },
    });
  });

  revalidatePath("/mercado/trocas");
  revalidatePath("/mercado/trocas/minhas");
  revalidatePath("/colecao");
}

// Cancelar oferta (devolve cartas+moedas do criador)
export async function cancelTradeOfferAction(offerId: string) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Voce precisa estar logado.");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) throw new Error("Usuario nao encontrado.");

  await prisma.$transaction(async (tx) => {
    const offer = await tx.tradeOffer.findUnique({
      where: { id: offerId },
      include: { offered: true },
    });
    if (!offer) throw new Error("Oferta nao encontrada.");
    if (offer.creatorUserId !== user.id) throw new Error("Voce nao e o criador.");
    if (offer.status !== "PENDING") throw new Error("Oferta nao esta mais pendente.");

    await tx.tradeOffer.update({
      where: { id: offerId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    // Devolver cartas
    for (const entry of offer.offered) {
      await tx.userCollection.upsert({
        where: { userId_cardId: { userId: user.id, cardId: entry.cardId } },
        update: { quantity: { increment: entry.quantity } },
        create: { userId: user.id, cardId: entry.cardId, quantity: entry.quantity },
      });
    }

    // Devolver moedas
    if (offer.coinsOffered > 0) {
      await tx.user.update({
        where: { id: user.id },
        data: { coins: { increment: offer.coinsOffered } },
      });
    }
  });

  revalidatePath("/mercado/trocas");
  revalidatePath("/mercado/trocas/minhas");
  revalidatePath("/colecao");
}

// Aceitar oferta
export async function acceptTradeOfferAction(offerId: string) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Voce precisa estar logado.");

  const acceptor = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true, coins: true },
  });
  if (!acceptor) throw new Error("Usuario nao encontrado.");

  await prisma.$transaction(async (tx) => {
    const offer = await tx.tradeOffer.findUnique({
      where: { id: offerId },
      include: { offered: true, demanded: true },
    });
    if (!offer) throw new Error("Oferta nao encontrada.");
    if (offer.status !== "PENDING") throw new Error("Oferta nao esta mais pendente.");
    if (offer.creatorUserId === acceptor.id) throw new Error("Voce nao pode aceitar sua propria oferta.");
    if (offer.targetUserId && offer.targetUserId !== acceptor.id) {
      throw new Error("Esta oferta e direcionada a outro jogador.");
    }

    // Validar moedas do aceitante
    if (offer.coinsDemanded > acceptor.coins) {
      throw new Error("Voce nao tem moedas suficientes.");
    }

    // Validar cartas do aceitante
    for (const entry of offer.demanded) {
      const col = await tx.userCollection.findUnique({
        where: { userId_cardId: { userId: acceptor.id, cardId: entry.cardId } },
      });
      if (!col || col.quantity < entry.quantity) {
        const card = await tx.card.findUnique({ where: { id: entry.cardId }, select: { name: true } });
        throw new Error(`Voce nao tem copias suficientes de ${card?.name ?? entry.cardId}.`);
      }
    }

    // Transferir cartas oferecidas do criador -> aceitante (j\u00e1 reservadas)
    for (const entry of offer.offered) {
      await tx.userCollection.upsert({
        where: { userId_cardId: { userId: acceptor.id, cardId: entry.cardId } },
        update: { quantity: { increment: entry.quantity } },
        create: { userId: acceptor.id, cardId: entry.cardId, quantity: entry.quantity },
      });
    }

    // Transferir moedas oferecidas do criador (j\u00e1 reservadas) -> aceitante
    if (offer.coinsOffered > 0) {
      await tx.user.update({
        where: { id: acceptor.id },
        data: { coins: { increment: offer.coinsOffered } },
      });
    }

    // Transferir cartas demandadas do aceitante -> criador
    for (const entry of offer.demanded) {
      await tx.userCollection.update({
        where: { userId_cardId: { userId: acceptor.id, cardId: entry.cardId } },
        data: { quantity: { decrement: entry.quantity } },
      });
      await tx.userCollection.upsert({
        where: { userId_cardId: { userId: offer.creatorUserId, cardId: entry.cardId } },
        update: { quantity: { increment: entry.quantity } },
        create: { userId: offer.creatorUserId, cardId: entry.cardId, quantity: entry.quantity },
      });
    }

    // Transferir moedas demandadas do aceitante -> criador
    if (offer.coinsDemanded > 0) {
      await tx.user.update({
        where: { id: acceptor.id },
        data: { coins: { decrement: offer.coinsDemanded } },
      });
      await tx.user.update({
        where: { id: offer.creatorUserId },
        data: { coins: { increment: offer.coinsDemanded } },
      });
    }

    // Registrar transacoes (se houve moedas)
    if (offer.coinsOffered > 0) {
      await tx.transaction.create({
        data: {
          userId: offer.creatorUserId,
          amount: -offer.coinsOffered,
          reason: "TRADE",
          note: JSON.stringify({ offerId, role: "OFFERED" }),
        },
      });
      await tx.transaction.create({
        data: {
          userId: acceptor.id,
          amount: offer.coinsOffered,
          reason: "TRADE",
          note: JSON.stringify({ offerId, role: "RECEIVED" }),
        },
      });
    }
    if (offer.coinsDemanded > 0) {
      await tx.transaction.create({
        data: {
          userId: acceptor.id,
          amount: -offer.coinsDemanded,
          reason: "TRADE",
          note: JSON.stringify({ offerId, role: "DEMANDED" }),
        },
      });
      await tx.transaction.create({
        data: {
          userId: offer.creatorUserId,
          amount: offer.coinsDemanded,
          reason: "TRADE",
          note: JSON.stringify({ offerId, role: "RECEIVED" }),
        },
      });
    }

    // Atualizar status
    await tx.tradeOffer.update({
      where: { id: offerId },
      data: {
        status: "ACCEPTED",
        acceptorUserId: acceptor.id,
        acceptedAt: new Date(),
      },
    });
  });

  revalidatePath("/mercado/trocas");
  revalidatePath("/mercado/trocas/minhas");
  revalidatePath("/colecao");
}