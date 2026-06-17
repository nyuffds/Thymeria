"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { parseFoundryCharacter } from "@/lib/character-sheet";

const prisma = new PrismaClient();

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Voce precisa estar logado.");
  const user = await prisma.user.findUnique({ where: { username: session.user.name } });
  if (!user || user.role !== "ADMIN") throw new Error("Apenas admin pode gerenciar fichas.");
  return user;
}

export async function uploadCharacterSheetAction(data: { userId: string; jsonContent: string }) {
  await requireAdmin();

  // Valida JSON
  const parsed = parseFoundryCharacter(data.jsonContent);
  if (!parsed) {
    throw new Error("JSON invalido ou nao e uma ficha de personagem do Foundry dnd5e.");
  }

  // Inicializa HP atual = HP value do JSON (ou 0 se nao tem)
  const hpInitial = parsed.hp.value ?? 0;

  await prisma.characterSheet.upsert({
    where: { userId: data.userId },
    update: {
      data: data.jsonContent,
      hpCurrent: hpInitial,
      hpTemp: parsed.hp.temp ?? 0,
    },
    create: {
      userId: data.userId,
      data: data.jsonContent,
      hpCurrent: hpInitial,
      hpTemp: parsed.hp.temp ?? 0,
      exhaustion: 0,
      notes: "",
    },
  });

  revalidatePath("/admin/fichas");
  revalidatePath("/conta");
}

export async function deleteCharacterSheetAction(userId: string) {
  await requireAdmin();
  await prisma.characterSheet.deleteMany({ where: { userId } });
  revalidatePath("/admin/fichas");
  revalidatePath("/conta");
}