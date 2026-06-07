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

// ─────────────────────────────────────────────
// HABILIDADES (admin)
// ─────────────────────────────────────────────

export async function createAbilityAction(data: {
  name: string;
  description: string;
  engineKey: string;       // string vazia = nenhum
  engineValue: number | null;
}) {
  const name = data.name.trim();
  const description = data.description.trim();
  if (!name) throw new Error("Nome é obrigatório.");
  if (!description) throw new Error("Descrição é obrigatória.");

  const exists = await prisma.ability.findUnique({ where: { name } });
  if (exists) throw new Error("Já existe uma habilidade com esse nome.");

  await prisma.ability.create({
    data: {
      name,
      description,
      engineKey: data.engineKey || null,
      engineValue: data.engineKey ? data.engineValue : null,
    },
  });

  revalidatePath("/admin/habilidades");
  revalidatePath("/admin");
}

export async function updateAbilityAction(id: string, data: {
  name: string;
  description: string;
  engineKey: string;
  engineValue: number | null;
  isActive: boolean;
}) {
  const name = data.name.trim();
  const description = data.description.trim();
  if (!name) throw new Error("Nome é obrigatório.");
  if (!description) throw new Error("Descrição é obrigatória.");

  const conflict = await prisma.ability.findFirst({
    where: { name, NOT: { id } },
  });
  if (conflict) throw new Error("Já existe outra habilidade com esse nome.");

  await prisma.ability.update({
    where: { id },
    data: {
      name,
      description,
      engineKey: data.engineKey || null,
      engineValue: data.engineKey ? data.engineValue : null,
      isActive: data.isActive,
    },
  });

  revalidatePath("/admin/habilidades");
  revalidatePath(`/admin/habilidades/${id}`);
  revalidatePath("/admin");
}

export async function deleteAbilityAction(id: string) {
  const cardCount = await prisma.card.count({ where: { abilityId: id } });
  if (cardCount > 0) {
    throw new Error(
      `Esta habilidade está em ${cardCount} carta(s). Remova a habilidade dessas cartas antes.`
    );
  }

  await prisma.ability.delete({ where: { id } });

  revalidatePath("/admin/habilidades");
  revalidatePath("/admin");
}

// ─────────────────────────────────────────────
// CARTAS (admin)
// ─────────────────────────────────────────────

export async function createCardAction(data: {
  name: string;
  factionId: string;
  power: number;
  rows: string[];                // ex: ["MELEE", "RANGED"]
  rarity: string;
  cardType: string;
  abilityId: string | null;
  loreText: string;
  imageUrl: string;
  isReleased: boolean;
}) {
  const name = data.name.trim();
  if (!name) throw new Error("Nome é obrigatório.");
  if (!data.factionId) throw new Error("Facção é obrigatória.");
  if (data.rows.length === 0) throw new Error("Selecione pelo menos uma fileira.");
  if (Number.isNaN(data.power)) throw new Error("Poder deve ser um número.");

  const exists = await prisma.card.findUnique({ where: { name } });
  if (exists) throw new Error("Já existe uma carta com esse nome.");

  await prisma.card.create({
    data: {
      name,
      factionId: data.factionId,
      power: data.power,
      rows: data.rows.join(","),
      rarity: data.rarity,
      cardType: data.cardType,
      abilityId: data.abilityId || null,
      loreText: data.loreText.trim() || null,
      imageUrl: data.imageUrl.trim() || null,
      isReleased: data.isReleased,
    },
  });

  revalidatePath("/admin/cartas");
  revalidatePath("/admin");
  revalidatePath("/cartas");
}

export async function updateCardAction(id: string, data: {
  name: string;
  factionId: string;
  power: number;
  rows: string[];
  rarity: string;
  cardType: string;
  abilityId: string | null;
  loreText: string;
  imageUrl: string;
  isReleased: boolean;
}) {
  const name = data.name.trim();
  if (!name) throw new Error("Nome é obrigatório.");
  if (!data.factionId) throw new Error("Facção é obrigatória.");
  if (data.rows.length === 0) throw new Error("Selecione pelo menos uma fileira.");

  const conflict = await prisma.card.findFirst({
    where: { name, NOT: { id } },
  });
  if (conflict) throw new Error("Já existe outra carta com esse nome.");

  await prisma.card.update({
    where: { id },
    data: {
      name,
      factionId: data.factionId,
      power: data.power,
      rows: data.rows.join(","),
      rarity: data.rarity,
      cardType: data.cardType,
      abilityId: data.abilityId || null,
      loreText: data.loreText.trim() || null,
      imageUrl: data.imageUrl.trim() || null,
      isReleased: data.isReleased,
    },
  });

  revalidatePath("/admin/cartas");
  revalidatePath(`/admin/cartas/${id}`);
  revalidatePath("/admin");
  revalidatePath("/cartas");
}

export async function deleteCardAction(id: string) {
  await prisma.card.delete({ where: { id } });
  revalidatePath("/admin/cartas");
  revalidatePath("/admin");
  revalidatePath("/cartas");
}

// ─────────────────────────────────────────────
// CONFIGURAÇÕES GLOBAIS (admin)
// ─────────────────────────────────────────────

export async function updateGameSettingsAction(data: {
  sellPriceCommon: number;
  sellPriceRare: number;
  sellPriceEpic: number;
  sellPriceLegendary: number;
  maxPerDeckCommon: number;
  maxPerDeckRare: number;
  maxPerDeckEpic: number;
  maxPerDeckLegendary: number;
  allowSellLastCopy: boolean;
}) {
  // Valida que todos os números são >= 0
  const numericFields = [
    data.sellPriceCommon, data.sellPriceRare, data.sellPriceEpic, data.sellPriceLegendary,
    data.maxPerDeckCommon, data.maxPerDeckRare, data.maxPerDeckEpic, data.maxPerDeckLegendary,
  ];
  if (numericFields.some((n) => Number.isNaN(n) || n < 0)) {
    throw new Error("Todos os valores numéricos devem ser positivos.");
  }
  if ([data.maxPerDeckCommon, data.maxPerDeckRare, data.maxPerDeckEpic, data.maxPerDeckLegendary].some((n) => n < 1)) {
    throw new Error("Limite por deck deve ser pelo menos 1.");
  }

  await prisma.gameSettings.upsert({
    where:  { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin");
}

// ─────────────────────────────────────────────
// ECONOMIA (admin)
// ─────────────────────────────────────────────

export async function adjustCoinsAction(data: {
  userId: string;
  amount: number;       // positivo soma, negativo subtrai
  reason: string;       // ADMIN_GRANT | MATCH_REWARD | OTHER...
  note: string;
}) {
  if (!data.userId) throw new Error("Jogador é obrigatório.");
  if (!data.amount || Number.isNaN(data.amount)) throw new Error("Valor inválido.");

  const user = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!user) throw new Error("Jogador não encontrado.");

  const newBalance = user.coins + data.amount;
  if (newBalance < 0) {
    throw new Error(`Saldo ficaria negativo (${newBalance}). Operação cancelada.`);
  }

  // Faz a transação atômica: atualiza saldo + registra histórico
  await prisma.$transaction([
    prisma.user.update({
      where: { id: data.userId },
      data:  { coins: newBalance },
    }),
    prisma.transaction.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        reason: data.reason,
        note:   data.note.trim() || null,
      },
    }),
  ]);

  revalidatePath("/admin/economia");
  revalidatePath("/admin");
  revalidatePath("/conta");
}