"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getUnreadNotifications() {
  const session = await auth();
  if (!session?.user?.name) return [];
  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) return [];
  const notifs = await prisma.notification.findMany({
    where: { userId: user.id, read: false },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  return notifs.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    linkUrl: n.linkUrl,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function markNotificationReadAction(notificationId: string) {
  const session = await auth();
  if (!session?.user?.name) return;
  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) return;
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { read: true },
  });
}

export async function markAllReadAction() {
  const session = await auth();
  if (!session?.user?.name) return;
  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) return;
  await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
}