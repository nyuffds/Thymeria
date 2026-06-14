"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { getHeadToHead } from "@/lib/stats";

const prisma = new PrismaClient();

export async function getHeadToHeadAction(otherUserId: string) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Voce precisa estar logado.");

  const me = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!me) throw new Error("Usuario nao encontrado.");

  return getHeadToHead(me.id, otherUserId);
}