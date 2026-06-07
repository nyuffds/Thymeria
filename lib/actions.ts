// lib/actions.ts
// Server Actions usadas pelos formulários de login e definição de senha.

"use server";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

/**
 * Verifica se o usuário existe e se já tem senha definida.
 * Retorna o "estado" do usuário pra a página de login decidir o que fazer.
 */
export async function checkUserStatus(username: string): Promise<
  | { status: "NOT_FOUND" }
  | { status: "NO_PASSWORD" }
  | { status: "HAS_PASSWORD" }
> {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return { status: "NOT_FOUND" };
  if (!user.passwordHash) return { status: "NO_PASSWORD" };
  return { status: "HAS_PASSWORD" };
}

/**
 * Tenta logar com username + senha.
 * Lança erro se falhar; a página captura e mostra mensagem.
 */
export async function loginAction(username: string, password: string) {
  await signIn("credentials", {
    username,
    password,
    redirect: false,
  });
}

/**
 * Define a senha de um usuário que ainda não tem (primeiro acesso).
 * Após definir, faz login automaticamente.
 */
export async function setPasswordAction(username: string, password: string) {
  if (password.length < 4) {
    throw new Error("Senha deve ter pelo menos 4 caracteres.");
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new Error("Usuário não encontrado.");
  if (user.passwordHash) throw new Error("Este usuário já tem senha definida.");

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { username },
    data:  { passwordHash: hash },
  });

  // Faz login automático após definir a senha
  await signIn("credentials", {
    username,
    password,
    redirect: false,
  });
}

// ─────────────────────────────────────────────
// FACÇÕES (admin)
// ─────────────────────────────────────────────

export async function createFactionAction(data: {
  name: string;
  color: string;
  description: string;
}) {
  const name = data.name.trim();
  if (!name) throw new Error("Nome é obrigatório.");
  if (!/^#[0-9a-fA-F]{6}$/.test(data.color)) throw new Error("Cor inválida (use formato #rrggbb).");

  const exists = await prisma.faction.findUnique({ where: { name } });
  if (exists) throw new Error("Já existe uma facção com esse nome.");

  await prisma.faction.create({
    data: {
      name,
      color: data.color,
      description: data.description.trim() || null,
    },
  });

  revalidatePath("/admin/faccoes");
  revalidatePath("/admin");
}

export async function updateFactionAction(id: string, data: {
  name: string;
  color: string;
  description: string;
  isActive: boolean;
}) {
  const name = data.name.trim();
  if (!name) throw new Error("Nome é obrigatório.");
  if (!/^#[0-9a-fA-F]{6}$/.test(data.color)) throw new Error("Cor inválida (use formato #rrggbb).");

  // Evita conflito de nome com outra facção
  const conflict = await prisma.faction.findFirst({
    where: { name, NOT: { id } },
  });
  if (conflict) throw new Error("Já existe outra facção com esse nome.");

  await prisma.faction.update({
    where: { id },
    data: {
      name,
      color: data.color,
      description: data.description.trim() || null,
      isActive: data.isActive,
    },
  });

  revalidatePath("/admin/faccoes");
  revalidatePath(`/admin/faccoes/${id}`);
  revalidatePath("/admin");
}

export async function deleteFactionAction(id: string) {
  // Verifica se há cartas usando essa facção
  const cardCount = await prisma.card.count({ where: { factionId: id } });
  if (cardCount > 0) {
    throw new Error(
      `Esta facção possui ${cardCount} carta(s) associada(s). Reatribua ou apague essas cartas antes.`
    );
  }

  await prisma.faction.delete({ where: { id } });

  revalidatePath("/admin/faccoes");
  revalidatePath("/admin");
}