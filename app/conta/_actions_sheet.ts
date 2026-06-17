"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function updateMySheetAction(data: {
  hpCurrent: number;
  hpTemp: number;
  exhaustion: number;
  notes: string;
}) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Voce precisa estar logado.");
  const user = await prisma.user.findUnique({ where: { username: session.user.name } });
  if (!user) throw new Error("Usuario nao encontrado.");

  if (data.exhaustion < 0 || data.exhaustion > 10) throw new Error("Exaustao deve estar entre 0 e 10.");
  if (data.hpCurrent < 0) throw new Error("HP atual nao pode ser negativo.");
  if (data.hpTemp < 0) throw new Error("HP temporario nao pode ser negativo.");

  await prisma.characterSheet.update({
    where: { userId: user.id },
    data: {
      hpCurrent: data.hpCurrent,
      hpTemp: data.hpTemp,
      exhaustion: data.exhaustion,
      notes: data.notes,
    },
  });

  revalidatePath("/conta");
}