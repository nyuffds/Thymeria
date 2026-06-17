"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Voce precisa estar logado.");
  const user = await prisma.user.findUnique({ where: { username: session.user.name } });
  if (!user || user.role !== "ADMIN") throw new Error("Apenas admin pode gerenciar usuarios.");
  return user;
}

function generateRandomPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

export async function createUserAction(data: {
  username: string;
  role: "PLAYER" | "ADMIN";
}): Promise<{ password: string }> {
  await requireAdmin();
  const trimmed = data.username.trim();
  if (!trimmed || trimmed.length < 3) throw new Error("Username deve ter pelo menos 3 caracteres.");

  const existing = await prisma.user.findUnique({ where: { username: trimmed } });
  if (existing) throw new Error("Username ja existe.");

  const password = generateRandomPassword();
  const hash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      username: trimmed,
      role: data.role,
      passwordHash: hash,
      coins: 0,
    },
  });

  revalidatePath("/admin/usuarios");
  return { password };
}

export async function resetPasswordAction(userId: string): Promise<{ password: string }> {
  await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Usuario nao encontrado.");

  const password = generateRandomPassword();
  const hash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });

  revalidatePath("/admin/usuarios");
  return { password };
}

export async function setUserRoleAction(data: { userId: string; role: "PLAYER" | "ADMIN" }) {
  const me = await requireAdmin();
  if (data.userId === me.id) throw new Error("Voce nao pode mudar seu proprio role.");
  await prisma.user.update({ where: { id: data.userId }, data: { role: data.role } });
  revalidatePath("/admin/usuarios");
}

export async function renameUserAction(data: { userId: string; newUsername: string }) {
  await requireAdmin();
  const trimmed = data.newUsername.trim();
  if (!trimmed || trimmed.length < 3) throw new Error("Username deve ter pelo menos 3 caracteres.");

  const existing = await prisma.user.findUnique({ where: { username: trimmed } });
  if (existing && existing.id !== data.userId) throw new Error("Username ja existe.");

  await prisma.user.update({ where: { id: data.userId }, data: { username: trimmed } });
  revalidatePath("/admin/usuarios");
}

export async function deleteUserAction(userId: string) {
  const me = await requireAdmin();
  if (userId === me.id) throw new Error("Voce nao pode deletar a si mesmo.");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Usuario nao encontrado.");

  // Limpa senha primeiro (caso onDelete da ficha falhe)
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/usuarios");
}