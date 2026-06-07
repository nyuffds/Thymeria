// lib/actions.ts
// Server Actions usadas pelos formulários de login e definição de senha.

"use server";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { redirect } from "next/navigation";

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