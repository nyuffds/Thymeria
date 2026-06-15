// lib/notifications.ts
// Helpers para criar e gerenciar notificacoes.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type NotificationType = "AUCTION_NEW" | "TRADE_OFFER" | "AUCTION_WON" | "AUCTION_LOST";

interface CreateOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
}

export async function createNotification(opts: CreateOptions) {
  return prisma.notification.create({
    data: {
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      linkUrl: opts.linkUrl ?? null,
      read: false,
    },
  });
}

// Cria notificacao para TODOS os usuarios (exceto o excluido, se houver)
export async function broadcastNotification(opts: Omit<CreateOptions, "userId"> & { exceptUserId?: string }) {
  const users = await prisma.user.findMany({
    where: opts.exceptUserId ? { NOT: { id: opts.exceptUserId } } : undefined,
    select: { id: true },
  });
  if (users.length === 0) return;
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      linkUrl: opts.linkUrl ?? null,
      read: false,
    })),
  });
}