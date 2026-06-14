"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

// Criar listagem
export async function createListingAction(data: {
  cardId: string;
  quantity: number;
  pricePerUnit: number;
}) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Voce precisa estar logado.");

  if (data.quantity < 1) throw new Error("Quantidade deve ser >= 1.");
  if (data.pricePerUnit < 0) throw new Error("Preco invalido.");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) throw new Error("Usuario nao encontrado.");

  await prisma.$transaction(async (tx) => {
    const card = await tx.card.findUnique({ where: { id: data.cardId } });
    if (!card) throw new Error("Carta nao encontrada.");
    if (!card.marketEligible) throw new Error("Esta carta nao pode ser listada no mercado.");

    const collection = await tx.userCollection.findUnique({
      where: { userId_cardId: { userId: user.id, cardId: data.cardId } },
    });
    if (!collection || collection.quantity < data.quantity) {
      throw new Error("Voce nao possui copias suficientes desta carta.");
    }

    // Debita a colecao (reserva pra listagem)
    await tx.userCollection.update({
      where: { id: collection.id },
      data: { quantity: { decrement: data.quantity } },
    });

    await tx.marketListing.create({
      data: {
        sellerUserId: user.id,
        cardId: data.cardId,
        quantity: data.quantity,
        pricePerUnit: data.pricePerUnit,
        status: "ACTIVE",
      },
    });
  });

  revalidatePath("/mercado");
  revalidatePath("/mercado/minhas");
  revalidatePath("/colecao");
}

// Cancelar listagem (devolve cartas pra colecao)
export async function cancelListingAction(listingId: string) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Voce precisa estar logado.");

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) throw new Error("Usuario nao encontrado.");

  await prisma.$transaction(async (tx) => {
    const listing = await tx.marketListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new Error("Listagem nao encontrada.");
    if (listing.sellerUserId !== user.id) throw new Error("Voce nao e o dono desta listagem.");
    if (listing.status !== "ACTIVE") throw new Error("Listagem ja foi vendida ou cancelada.");

    await tx.marketListing.update({
      where: { id: listingId },
      data: { status: "CANCELLED" },
    });

    // Devolve cartas pra colecao
    await tx.userCollection.upsert({
      where: { userId_cardId: { userId: user.id, cardId: listing.cardId } },
      update: { quantity: { increment: listing.quantity } },
      create: { userId: user.id, cardId: listing.cardId, quantity: listing.quantity },
    });
  });

  revalidatePath("/mercado");
  revalidatePath("/mercado/minhas");
  revalidatePath("/colecao");
}

// Comprar listagem
export async function buyListingAction(listingId: string) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Voce precisa estar logado.");

  const buyer = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true, coins: true },
  });
  if (!buyer) throw new Error("Usuario nao encontrado.");

  await prisma.$transaction(async (tx) => {
    const listing = await tx.marketListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new Error("Listagem nao encontrada.");
    if (listing.status !== "ACTIVE") throw new Error("Listagem nao esta mais ativa.");
    if (listing.sellerUserId === buyer.id) throw new Error("Voce nao pode comprar a sua propria listagem.");

    const totalPrice = listing.pricePerUnit * listing.quantity;
    if (buyer.coins < totalPrice) {
      throw new Error("Voce nao tem moedas suficientes.");
    }

    const settings = await tx.gameSettings.findUnique({ where: { id: "singleton" } });
    const feePercent = settings?.marketFeePercent ?? 0.05;
    const fee = Math.floor(totalPrice * feePercent);
    const sellerReceives = totalPrice - fee;

    // Debita comprador
    await tx.user.update({
      where: { id: buyer.id },
      data: { coins: { decrement: totalPrice } },
    });

    // Credita vendedor (descontada a taxa)
    if (sellerReceives > 0) {
      await tx.user.update({
        where: { id: listing.sellerUserId },
        data: { coins: { increment: sellerReceives } },
      });
    }

    // Adiciona carta na colecao do comprador
    await tx.userCollection.upsert({
      where: { userId_cardId: { userId: buyer.id, cardId: listing.cardId } },
      update: { quantity: { increment: listing.quantity } },
      create: { userId: buyer.id, cardId: listing.cardId, quantity: listing.quantity },
    });

    // Marca como vendida
    await tx.marketListing.update({
      where: { id: listingId },
      data: { status: "SOLD", buyerUserId: buyer.id, soldAt: new Date() },
    });

    // Registra transacao do comprador
    await tx.transaction.create({
      data: {
        userId: buyer.id,
        amount: -totalPrice,
        reason: "MARKET_BUY",
        note: JSON.stringify({ listingId, cardId: listing.cardId, quantity: listing.quantity, fee }),
      },
    });

    // Registra transacao do vendedor (se recebeu algo)
    if (sellerReceives > 0) {
      await tx.transaction.create({
        data: {
          userId: listing.sellerUserId,
          amount: sellerReceives,
          reason: "MARKET_SELL",
          note: JSON.stringify({ listingId, cardId: listing.cardId, quantity: listing.quantity, fee, totalPrice }),
        },
      });
    }
  });

  revalidatePath("/mercado");
  revalidatePath("/mercado/minhas");
  revalidatePath("/colecao");
}