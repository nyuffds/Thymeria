// lib/actions.ts
// Server Actions usadas pelos formulários de login e definição de senha.

"use server";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { signIn, auth } from "@/auth";
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

// ---------------------------------------------
// FACÇÕES (admin)
// ---------------------------------------------

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

// ---------------------------------------------
// HABILIDADES (admin)
// ---------------------------------------------

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

// ---------------------------------------------
// CARTAS (admin)
// ---------------------------------------------

export async function createCardAction(data: {
  name: string;
  factionId: string;
  power: number;
  rows: string[];
  rarity: string;
  cardType: string;
  leaderMode: string | null;
  abilityId: string | null;
  loreText: string;
  imageUrl: string;
  frameUrl: string;
  isReleased: boolean;
}) {
  const name = data.name.trim();
  if (!name) throw new Error("Nome é obrigatório.");
  if (!data.factionId) throw new Error("Facção é obrigatória.");
  if (data.rows.length === 0) throw new Error("Selecione pelo menos uma fileira.");
  if (Number.isNaN(data.power)) throw new Error("Poder deve ser um número.");

  // leaderMode só faz sentido pra LEADER
  const leaderMode = data.cardType === "LEADER" ? (data.leaderMode || "PASSIVE") : null;

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
      leaderMode,
      abilityId: data.abilityId || null,
      loreText: data.loreText.trim() || null,
      imageUrl: data.imageUrl.trim() || null,
      frameUrl: data.frameUrl.trim() || null,
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
  leaderMode: string | null;
  abilityId: string | null;
  loreText: string;
  imageUrl: string;
  frameUrl: string;
  isReleased: boolean;
}) {
  const name = data.name.trim();
  if (!name) throw new Error("Nome é obrigatório.");
  if (!data.factionId) throw new Error("Facção é obrigatória.");
  if (data.rows.length === 0) throw new Error("Selecione pelo menos uma fileira.");

  const leaderMode = data.cardType === "LEADER" ? (data.leaderMode || "PASSIVE") : null;

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
      leaderMode,
      abilityId: data.abilityId || null,
      loreText: data.loreText.trim() || null,
      imageUrl: data.imageUrl.trim() || null,
      frameUrl: data.frameUrl.trim() || null,
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

// ---------------------------------------------
// CONFIGURAÇÕES GLOBAIS (admin)
// ---------------------------------------------

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
  pityThresholdCommon: number;
  pityThresholdRare: number;
  pityThresholdEpic: number;
  pityThresholdLegendary: number;
  maxDecksPerPlayer: number;
  minCardsPerDeck: number;
  maxCardsPerDeck: number;
}) {
  const numericFields = [
    data.sellPriceCommon, data.sellPriceRare, data.sellPriceEpic, data.sellPriceLegendary,
    data.maxPerDeckCommon, data.maxPerDeckRare, data.maxPerDeckEpic, data.maxPerDeckLegendary,
    data.pityThresholdCommon, data.pityThresholdRare, data.pityThresholdEpic, data.pityThresholdLegendary,
    data.maxDecksPerPlayer, data.minCardsPerDeck, data.maxCardsPerDeck,
  ];
  if (numericFields.some((n) => Number.isNaN(n) || n < 0)) {
    throw new Error("Todos os valores numéricos devem ser positivos.");
  }
  if ([data.maxPerDeckCommon, data.maxPerDeckRare, data.maxPerDeckEpic, data.maxPerDeckLegendary].some((n) => n < 1)) {
    throw new Error("Limite por deck deve ser pelo menos 1.");
  }
  if ([data.pityThresholdCommon, data.pityThresholdRare, data.pityThresholdEpic, data.pityThresholdLegendary].some((n) => n < 1)) {
    throw new Error("Limite de pity deve ser pelo menos 1.");
  }
  if (data.maxDecksPerPlayer < 1) {
    throw new Error("Máx. decks por jogador deve ser pelo menos 1.");
  }
  if (data.minCardsPerDeck < 1) {
    throw new Error("Mínimo de cartas no deck deve ser pelo menos 1.");
  }
  if (data.maxCardsPerDeck < data.minCardsPerDeck) {
    throw new Error("Máximo de cartas não pode ser menor que o mínimo.");
  }

  await prisma.gameSettings.upsert({
    where:  { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin");
}

// ---------------------------------------------
// ECONOMIA (admin)
// ---------------------------------------------

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

// ---------------------------------------------
// BOOSTERS (admin)
// ---------------------------------------------

export interface BoosterRuleInput {
  mode: "FIXED_POOL" | "BY_RARITY" | "WEIGHTED";
  rarity: string | null;
  cardId: string | null;
  quantity: number;
  weights: string | null;
}

function validateBoosterPayload(data: {
  name: string;
  price: number;
  rules: BoosterRuleInput[];
}) {
  const name = data.name.trim();
  if (!name) throw new Error("Nome é obrigatório.");
  if (Number.isNaN(data.price) || data.price < 0) throw new Error("Preço inválido.");
  if (data.rules.length === 0) throw new Error("Adicione pelo menos uma regra de drop.");

  for (const [i, r] of data.rules.entries()) {
    const where = `Regra ${i + 1}`;
    if (r.quantity < 1) throw new Error(`${where}: quantidade deve ser = 1.`);
    if (r.mode === "FIXED_POOL" && !r.cardId) throw new Error(`${where}: selecione uma carta.`);
    if (r.mode === "BY_RARITY" && !r.rarity)  throw new Error(`${where}: selecione uma raridade.`);
    if (r.mode === "WEIGHTED") {
      if (!r.weights) throw new Error(`${where}: defina os pesos das raridades.`);
      try {
        const parsed = JSON.parse(r.weights) as Record<string, number>;
        const sum = Object.values(parsed).reduce((a, b) => a + b, 0);
        if (sum !== 100) throw new Error(`${where}: a soma dos pesos deve ser exatamente 100 (atual: ${sum}).`);
      } catch (err) {
        if (err instanceof Error && err.message.includes("soma dos pesos")) throw err;
        throw new Error(`${where}: pesos invalidos (JSON malformado).`);
      }
    }
  }
}

export async function createBoosterAction(data: {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  guaranteeRareOrBetter?: boolean;
  factionFiltersCsv?: string | null;
  abilityFiltersCsv?: string | null;
  includeNeutro?: boolean;
  rules: BoosterRuleInput[];
}) {
  validateBoosterPayload(data);

  const exists = await prisma.booster.findUnique({ where: { name: data.name.trim() } });
  if (exists) throw new Error("Já existe um booster com esse nome.");

  await prisma.booster.create({
    data: {
      name: data.name.trim(),
      description: data.description.trim() || null,
      price: data.price,
      imageUrl: data.imageUrl.trim() || null,
      guaranteeRareOrBetter: data.guaranteeRareOrBetter ?? false,
      factionFiltersCsv: data.factionFiltersCsv ?? null,
      abilityFiltersCsv: data.abilityFiltersCsv ?? null,
      includeNeutro: data.includeNeutro ?? true,
      isActive: true,
      rules: {
        create: data.rules.map((r) => ({
          mode: r.mode,
          rarity: r.mode === "BY_RARITY" ? r.rarity : null,
          cardId: r.mode === "FIXED_POOL" ? r.cardId : null,
            weights: r.mode === "WEIGHTED" ? r.weights : null,
            quantity: r.quantity,
        })),
      },
    },
  });

  revalidatePath("/admin/boosters");
  revalidatePath("/admin");
  revalidatePath("/loja");
}

export async function updateBoosterAction(id: string, data: {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isActive: boolean;
  guaranteeRareOrBetter?: boolean;
  factionFiltersCsv?: string | null;
  abilityFiltersCsv?: string | null;
  includeNeutro?: boolean;
  rules: BoosterRuleInput[];
}) {
  validateBoosterPayload(data);

  const conflict = await prisma.booster.findFirst({
    where: { name: data.name.trim(), NOT: { id } },
  });
  if (conflict) throw new Error("Já existe outro booster com esse nome.");

  // Estratégia: apaga as regras antigas e cria as novas (mais simples
  // que diffar; regras não têm dados externos vinculados a elas).
  await prisma.$transaction([
    prisma.boosterRule.deleteMany({ where: { boosterId: id } }),
    prisma.booster.update({
      where: { id },
      data: {
        name: data.name.trim(),
        description: data.description.trim() || null,
        price: data.price,
        imageUrl: data.imageUrl.trim() || null,
        isActive: data.isActive,
        guaranteeRareOrBetter: data.guaranteeRareOrBetter ?? false,
          factionFiltersCsv: data.factionFiltersCsv ?? null,
          abilityFiltersCsv: data.abilityFiltersCsv ?? null,
          includeNeutro: data.includeNeutro ?? true,
          rules: {
          create: data.rules.map((r) => ({
            mode: r.mode,
            rarity: r.mode === "BY_RARITY" ? r.rarity : null,
            cardId: r.mode === "FIXED_POOL" ? r.cardId : null,
            weights: r.mode === "WEIGHTED" ? r.weights : null,
            quantity: r.quantity,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/admin/boosters");
  revalidatePath(`/admin/boosters/${id}`);
  revalidatePath("/admin");
  revalidatePath("/loja");
}

export async function deleteBoosterAction(id: string) {
  // Se já houve aberturas, bloqueia (preserva auditoria)
  const openings = await prisma.boosterOpening.count({ where: { boosterId: id } });
  if (openings > 0) {
    throw new Error(
      `Este booster já foi aberto ${openings} vez(es). Desative em vez de excluir (preserva histórico).`
    );
  }

  await prisma.booster.delete({ where: { id } });

  revalidatePath("/admin/boosters");
  revalidatePath("/admin");
  revalidatePath("/loja");
}

// ---------------------------------------------
// COMPRA DE BOOSTER (jogador)
// ---------------------------------------------

  export async function buyBoosterAction(boosterId: string, quantity: number = 1) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Você precisa estar logado.");

  const [user, booster] = await Promise.all([
    prisma.user.findUnique({ where: { username: session.user.name } }),
    prisma.booster.findUnique({ where: { id: boosterId } }),
  ]);

  if (!user) throw new Error("Usuário não encontrado.");
  if (!booster) throw new Error("Booster não encontrado.");
  if (!booster.isActive) throw new Error("Este booster não está disponível.");

  if (quantity < 1 || quantity > 50) {
    throw new Error("Quantidade inválida (1 a 50 por compra).");
  }

  const totalCost = booster.price * quantity;
  if (user.coins < totalCost) {
    throw new Error(`Saldo insuficiente. Você tem ${user.coins} e o total custa ${totalCost}.`);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data:  { coins: user.coins - totalCost },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        amount: -totalCost,
        reason: "BOOSTER_PURCHASE",
        note:   quantity === 1 ? `Comprou: ${booster.name}` : `Comprou ${quantity}x: ${booster.name}`,
      },
    }),
    ...Array.from({ length: quantity }, () =>
      prisma.unopenedBooster.create({
        data: {
          userId: user.id,
          boosterId: booster.id,
          pricePaid: booster.price,
        },
      })
    ),
  ]);

  revalidatePath("/loja");
  revalidatePath("/estante");
  revalidatePath("/conta");
}

// ---------------------------------------------
// ABERTURA DE BOOSTER (jogador)
// ---------------------------------------------

export interface OpenedCard {
  id: string;
  name: string;
  rarity: string;
  cardType: string;
  rows: string;
  power: number;
  imageUrl: string | null;
  frameUrl: string | null;
  loreText: string | null;
  faction: { name: string; color: string };
  ability: { name: string; description: string } | null;
  wasNew: boolean;
}

export async function openUnopenedBoosterAction(unopenedId: string): Promise<OpenedCard[]> {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Você precisa estar logado.");

  const user = await prisma.user.findUnique({ where: { username: session.user.name } });
  if (!user) throw new Error("Usuário não encontrado.");

  const unopened = await prisma.unopenedBooster.findUnique({
    where: { id: unopenedId },
    include: {
      booster: { include: { rules: true } },
    },
  });
  if (!unopened) throw new Error("Booster não encontrado.");
  if (unopened.userId !== user.id) throw new Error("Este booster não é seu.");

  // Carrega configurações de pity
  const settings = await prisma.gameSettings.upsert({
    where:  { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  const pityThreshold: Record<string, number> = {
    COMMON:    settings.pityThresholdCommon,
    RARE:      settings.pityThresholdRare,
    EPIC:      settings.pityThresholdEpic,
    LEGENDARY: settings.pityThresholdLegendary,
  };

  // Carrega coleção atual do jogador (cardId ? quantity)
  const collectionRows = await prisma.userCollection.findMany({
    where: { userId: user.id },
    select: { cardId: true },
  });
  const ownedCardIds = new Set(collectionRows.map((r) => r.cardId));

  // Carrega pity counters atuais (rarity ? counter)
  const pityRows = await prisma.userPity.findMany({
    where: { userId: user.id },
  });
  const pityCounters: Record<string, number> = {
    COMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0,
  };
  for (const p of pityRows) {
    pityCounters[p.rarity] = p.counter;
  }
// Constroi o where clause para a busca de cartas elegiveis em um sorteio,
// considerando filtros de fac\u00e7\u00e3o e habilidade do booster.
function buildBoosterCardFilter(
  booster: { factionFiltersCsv: string | null; abilityFiltersCsv: string | null; includeNeutro: boolean },
  base: { rarity: string }
): {
  isReleased: true;
  rarity: string;
  factionId?: { in: string[] };
  abilityId?: { in: string[] };
} {
  const where: {
    isReleased: true;
    rarity: string;
    factionId?: { in: string[] };
    abilityId?: { in: string[] };
  } = {
    isReleased: true,
    rarity: base.rarity,
  };

  if (booster.factionFiltersCsv) {
    const factionIds = booster.factionFiltersCsv.split(",").filter(Boolean);
    if (factionIds.length > 0) {
      where.factionId = { in: factionIds };
    }
  }

  if (booster.abilityFiltersCsv) {
    const abilityIds = booster.abilityFiltersCsv.split(",").filter(Boolean);
    if (abilityIds.length > 0) {
      where.abilityId = { in: abilityIds };
    }
  }

  return where;
}


  
  // Se o booster tem filtro de facao + includeNeutro, adiciona o ID da faccao Neutro ao filtro
  if (unopened.booster.factionFiltersCsv && unopened.booster.includeNeutro) {
    const neutroFaction = await prisma.faction.findFirst({
      where: { name: "Neutro" },
      select: { id: true },
    });
    if (neutroFaction) {
      const currentIds = unopened.booster.factionFiltersCsv.split(",").filter(Boolean);
      if (!currentIds.includes(neutroFaction.id)) {
        unopened.booster.factionFiltersCsv = [...currentIds, neutroFaction.id].join(",");
      }
    }
  }
// Sorteia as cartas. Para cada carta:
  //   1. Se vier de FIXED_POOL ? respeita (não interfere no pity)
  //   2. Se vier de BY_RARITY ? considera pity:
  //      - Se contador já bateu o threshold E existe carta nova dessa raridade
  //        ? força sortear das novas
  //      - Caso contrário ? sorteio normal
  //   3. Atualiza pity counter da raridade:
  //      - Se carta foi nova ? zera
  //      - Se foi repetida ? incrementa
  const cardIds: string[] = [];

  for (const rule of unopened.booster.rules) {
    if (rule.mode === "FIXED_POOL") {
      if (!rule.cardId) continue;
      for (let i = 0; i < rule.quantity; i++) {
        cardIds.push(rule.cardId);
        // Atualiza pity baseado na carta fixa também
        const card = await prisma.card.findUnique({ where: { id: rule.cardId }, select: { rarity: true } });
        if (card && pityCounters[card.rarity] !== undefined) {
          if (ownedCardIds.has(rule.cardId)) {
            pityCounters[card.rarity]++;
          } else {
            pityCounters[card.rarity] = 0;
            ownedCardIds.add(rule.cardId);
          }
        }
      }
    } else if (rule.mode === "BY_RARITY") {
      if (!rule.rarity) continue;
      const rarity = rule.rarity;

      const pool = await prisma.card.findMany({
        where: buildBoosterCardFilter(unopened.booster, { rarity }),
        select: { id: true },
      });
      if (pool.length === 0) {
        throw new Error(`Não há cartas liberadas da raridade ${rarity}. Avise o GM.`);
      }

      const newPool = pool.filter((c) => !ownedCardIds.has(c.id));

      for (let i = 0; i < rule.quantity; i++) {
        const threshold = pityThreshold[rarity] ?? 999;
        const counter = pityCounters[rarity] ?? 0;
        const pityTriggered = counter >= threshold && newPool.length > 0;

        const sourcePool = pityTriggered ? newPool : pool;
        const pickIdx = Math.floor(Math.random() * sourcePool.length);
        const pickId = sourcePool[pickIdx].id;
        cardIds.push(pickId);

        const wasNew = !ownedCardIds.has(pickId);
        if (wasNew) {
          pityCounters[rarity] = 0;
          ownedCardIds.add(pickId);
          // Remove do newPool pra não sortear de novo no mesmo booster
          const idxInNewPool = newPool.findIndex((c) => c.id === pickId);
          if (idxInNewPool !== -1) newPool.splice(idxInNewPool, 1);
        } else {
          pityCounters[rarity]++;
        }
      }
    } else if (rule.mode === "WEIGHTED") {
      if (!rule.weights) continue;
      let weights: Record<string, number>;
      try {
        weights = JSON.parse(rule.weights);
      } catch {
        continue;
      }

      const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
      if (totalWeight <= 0) continue;

      for (let i = 0; i < rule.quantity; i++) {
        // Sorteia raridade pelos pesos
        let roll = Math.random() * totalWeight;
        let chosenRarity: string | null = null;
        for (const [rar, w] of Object.entries(weights)) {
          roll -= w;
          if (roll <= 0) { chosenRarity = rar; break; }
        }
        if (!chosenRarity) chosenRarity = Object.keys(weights)[0];

        // Pega o pool da raridade sorteada
        const pool = await prisma.card.findMany({
          where: buildBoosterCardFilter(unopened.booster, { rarity: chosenRarity }),
          select: { id: true },
        });
        if (pool.length === 0) continue;

        const newPool = pool.filter((c) => !ownedCardIds.has(c.id));
        const threshold = pityThreshold[chosenRarity] ?? 999;
        const counter = pityCounters[chosenRarity] ?? 0;
        const pityTriggered = counter >= threshold && newPool.length > 0;
        const sourcePool = pityTriggered ? newPool : pool;

        const pickIdx = Math.floor(Math.random() * sourcePool.length);
        const pickId = sourcePool[pickIdx].id;
        cardIds.push(pickId);

        const wasNew = !ownedCardIds.has(pickId);
        if (wasNew) {
          pityCounters[chosenRarity] = 0;
          ownedCardIds.add(pickId);
        } else {
          pityCounters[chosenRarity] = (pityCounters[chosenRarity] ?? 0) + 1;
        }
      }    }

  }

  if (cardIds.length === 0) throw new Error("Booster sem regras válidas. Avise o GM.");

  // Aplica tudo numa transação
  const result = await prisma.$transaction(async (tx) => {
    await tx.unopenedBooster.delete({ where: { id: unopenedId } });

    // Releitura do estado real "antes da abertura" pra marcar wasNew corretamente
    const existing = await tx.userCollection.findMany({
      where: { userId: user.id, cardId: { in: cardIds } },
      select: { cardId: true },
    });
    const alreadyOwned = new Set(existing.map((e) => e.cardId));

    // Conta quantos de cada
    const counts = new Map<string, number>();
    for (const id of cardIds) counts.set(id, (counts.get(id) ?? 0) + 1);

    // Atualiza coleção
    for (const [cardId, qty] of counts.entries()) {
      await tx.userCollection.upsert({
        where:  { userId_cardId: { userId: user.id, cardId } },
        update: { quantity: { increment: qty } },
        create: { userId: user.id, cardId, quantity: qty },
      });
    }

    // Atualiza pity counters
    for (const rarity of Object.keys(pityCounters)) {
      await tx.userPity.upsert({
        where:  { userId_rarity: { userId: user.id, rarity } },
        update: { counter: pityCounters[rarity] },
        create: { userId: user.id, rarity, counter: pityCounters[rarity] },
      });
    }

    
    // Garantia "estilo Hearthstone": se o booster tiver flag e nenhum card sorteado for >= RARE,
    // troca o ultimo por uma carta rara aleatoria (preferindo nova nao possuida).
    if (unopened.booster.guaranteeRareOrBetter && cardIds.length > 0) {
      const drawnCards = await tx.card.findMany({
        where: { id: { in: cardIds } },
        select: { id: true, rarity: true },
      });
      const rarityRank: Record<string, number> = {
        COMMON: 0, RARE: 1, EPIC: 2, LEGENDARY: 3, MYTHIC: 4,
      };
      const highestRank = Math.max(...drawnCards.map((c) => rarityRank[c.rarity] ?? 0));
      if (highestRank < 1) {
        // Sortea uma carta de raridade RARE+
        const rarePool = await tx.card.findMany({
          where: { isReleased: true, rarity: { in: ["RARE", "EPIC", "LEGENDARY", "MYTHIC"] } },
          select: { id: true, rarity: true },
        });
        if (rarePool.length > 0) {
          // Prefere cartas novas
          const newRarePool = rarePool.filter((c) => !ownedCardIds.has(c.id));
          const sourcePool = newRarePool.length > 0 ? newRarePool : rarePool;
          const pickIdx = Math.floor(Math.random() * sourcePool.length);
          const pickId = sourcePool[pickIdx].id;
          // Substitui o ultimo card sorteado
          cardIds[cardIds.length - 1] = pickId;
        }
      }
    }
// Cria opening + results
    const opening = await tx.boosterOpening.create({
      data: {
        userId: user.id,
        boosterId: unopened.boosterId,
        pricePaid: unopened.pricePaid,
        results: {
          create: cardIds.map((cardId) => ({
            cardId,
            wasNew: !alreadyOwned.has(cardId),
          })),
        },
      },
    });

    // Busca dados completos das cartas pra UI
    const fullCards = await tx.card.findMany({
      where: { id: { in: Array.from(counts.keys()) } },
      include: { faction: true, ability: true },
    });
    const fullById = new Map(fullCards.map((c) => [c.id, c]));

    // Marca wasNew baseado em alreadyOwned + ocorrência no booster
    const seenInBooster = new Set<string>();
    const opened: OpenedCard[] = cardIds.map((id) => {
      const c = fullById.get(id)!;
      const isFirstInBooster = !seenInBooster.has(id);
      seenInBooster.add(id);
      const wasNew = !alreadyOwned.has(id) && isFirstInBooster;
      return {
          id: c.id,
          name: c.name,
          rarity: c.rarity,
          cardType: c.cardType,
          rows: c.rows,
          power: c.power,
          imageUrl: c.imageUrl,
          frameUrl: c.frameUrl,
          loreText: c.loreText,
          faction: { name: c.faction.name, color: c.faction.color },
          ability: c.ability ? { name: c.ability.name, description: c.ability.description } : null,
          wasNew,
        };
    });

    return { openingId: opening.id, opened };
  });

  revalidatePath("/estante");
  revalidatePath("/colecao");
  revalidatePath("/conta");

  return result.opened;
}

// ---------------------------------------------
// VENDA DE CARTAS (jogador)
// ---------------------------------------------

export async function sellCardAction(data: { cardId: string; quantity: number }) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Você precisa estar logado.");

  const qty = Math.floor(data.quantity);
  if (!qty || qty < 1) throw new Error("Quantidade inválida.");

  const [user, card, settings] = await Promise.all([
    prisma.user.findUnique({ where: { username: session.user.name } }),
    prisma.card.findUnique({ where: { id: data.cardId } }),
    prisma.gameSettings.upsert({
      where:  { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    }),
  ]);

  if (!user) throw new Error("Usuário não encontrado.");
  if (!card) throw new Error("Carta não encontrada.");

  // Verifica posse e quantidade
  const entry = await prisma.userCollection.findUnique({
    where: { userId_cardId: { userId: user.id, cardId: card.id } },
  });
  if (!entry || entry.quantity < qty) {
    throw new Error(`Você não tem ${qty} cópia(s) dessa carta.`);
  }

  // Política da última cópia
  if (!settings.allowSellLastCopy && entry.quantity - qty < 1) {
    throw new Error("Você não pode vender a última cópia desta carta.");
  }

  // Preço unitário: override da carta > padrão por raridade
  const defaultByRarity: Record<string, number> = {
    COMMON:    settings.sellPriceCommon,
    RARE:      settings.sellPriceRare,
    EPIC:      settings.sellPriceEpic,
    LEGENDARY: settings.sellPriceLegendary,
  };
  const unitPrice = card.sellPriceOverride ?? defaultByRarity[card.rarity] ?? 0;
  const total = unitPrice * qty;

  if (total < 0) throw new Error("Preço inválido.");

  // Transação atômica
  const newQty = entry.quantity - qty;

  await prisma.$transaction(async (tx) => {
    if (newQty === 0) {
      await tx.userCollection.delete({ where: { id: entry.id } });
    } else {
      await tx.userCollection.update({
        where: { id: entry.id },
        data:  { quantity: newQty },
      });
    }

    await tx.user.update({
      where: { id: user.id },
      data:  { coins: user.coins + total },
    });

    await tx.transaction.create({
      data: {
        userId: user.id,
        amount: total,
        reason: "CARD_SELL",
        note:   `Vendeu ${qty}× ${card.name}`,
      },
    });
  });

  revalidatePath("/colecao");
  revalidatePath(`/colecao/${card.id}`);
  revalidatePath("/conta");

  return { coinsGained: total, newQuantity: newQty };
}

// ---------------------------------------------
// DECKS (jogador)
// ---------------------------------------------

/**
 * Valida um conjunto de cartas (sem líder) contra:
 *   - posse na coleção
 *   - limite por carta (maxPerDeck por raridade + override)
 *   - facção (todas devem ser da factionId ou neutras)
 * Não valida tamanho mín/máx (essa validação é separada porque
 * o builder mostra estado intermediário inválido).
 */
async function validateDeckCards(params: {
  userId: string;
  factionId: string;
  cardIds: string[];           // 1 entrada por cópia (3x mesma = 3 entradas)
}) {
  if (params.cardIds.length === 0) return;

  const [collectionRows, cards, settings, neutralFaction] = await Promise.all([
    prisma.userCollection.findMany({
      where: { userId: params.userId, cardId: { in: params.cardIds } },
    }),
    prisma.card.findMany({
      where: { id: { in: params.cardIds } },
      include: { faction: true },
    }),
    prisma.gameSettings.upsert({
      where:  { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    }),
    prisma.faction.findFirst({ where: { name: "Neutro" } }),
  ]);

  const ownedByCard = new Map(collectionRows.map((r) => [r.cardId, r.quantity]));
  const cardById = new Map(cards.map((c) => [c.id, c]));

  // Conta uso de cada cardId no deck proposto
  const useCount = new Map<string, number>();
  for (const id of params.cardIds) useCount.set(id, (useCount.get(id) ?? 0) + 1);

  const defaultMax: Record<string, number> = {
    COMMON:    settings.maxPerDeckCommon,
    RARE:      settings.maxPerDeckRare,
    EPIC:      settings.maxPerDeckEpic,
    LEGENDARY: settings.maxPerDeckLegendary,
  };

  for (const [cardId, count] of useCount.entries()) {
    const card = cardById.get(cardId);
    if (!card) throw new Error(`Carta ${cardId} não existe.`);

    // Posse
    const owned = ownedByCard.get(cardId) ?? 0;
    if (count > owned) {
      throw new Error(`Você só tem ${owned} cópia(s) de "${card.name}" (tentou usar ${count}).`);
    }

    // Limite por carta
    const limit = card.maxPerDeckOverride ?? defaultMax[card.rarity] ?? 1;
    if (count > limit) {
      throw new Error(`"${card.name}" só pode entrar até ${limit} vez(es) no deck.`);
    }

    // Facção: precisa ser igual à do líder OU ser Neutro
    const isNeutral = neutralFaction && card.factionId === neutralFaction.id;
    if (card.factionId !== params.factionId && !isNeutral) {
      throw new Error(`"${card.name}" (${card.faction.name}) não pertence à facção do deck.`);
    }
  }
}

export async function createDeckAction(data: {
  name: string;
  leaderCardId: string;
}) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Você precisa estar logado.");

  const name = data.name.trim();
  if (!name) throw new Error("Nome do deck é obrigatório.");

  const [user, leaderCard, settings] = await Promise.all([
    prisma.user.findUnique({ where: { username: session.user.name } }),
    prisma.card.findUnique({ where: { id: data.leaderCardId } }),
    prisma.gameSettings.upsert({
      where:  { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    }),
  ]);

  if (!user) throw new Error("Usuário não encontrado.");
  if (!leaderCard) throw new Error("Carta líder não encontrada.");
  if (leaderCard.cardType !== "LEADER") throw new Error("A carta escolhida não é um líder.");

  // Verifica posse do líder
  const ownership = await prisma.userCollection.findUnique({
    where: { userId_cardId: { userId: user.id, cardId: leaderCard.id } },
  });
  if (!ownership || ownership.quantity < 1) {
    throw new Error("Você não possui esse líder na sua coleção.");
  }

  // Limite de decks
  const deckCount = await prisma.deck.count({ where: { userId: user.id } });
  if (deckCount >= settings.maxDecksPerPlayer) {
    throw new Error(`Limite de ${settings.maxDecksPerPlayer} decks atingido. Exclua um deck antes de criar outro.`);
  }

  const deck = await prisma.deck.create({
    data: {
      userId:    user.id,
      factionId: leaderCard.factionId,
      name,
      leader: {
        create: { cardId: leaderCard.id },
      },
    },
  });

  revalidatePath("/decks");
  return { deckId: deck.id };
}

export async function renameDeckAction(deckId: string, name: string) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Você precisa estar logado.");

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Nome do deck é obrigatório.");

  const user = await prisma.user.findUnique({ where: { username: session.user.name } });
  if (!user) throw new Error("Usuário não encontrado.");

  const deck = await prisma.deck.findUnique({ where: { id: deckId } });
  if (!deck) throw new Error("Deck não encontrado.");
  if (deck.userId !== user.id) throw new Error("Este deck não é seu.");

  await prisma.deck.update({
    where: { id: deckId },
    data:  { name: trimmed },
  });

  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
}

export async function deleteDeckAction(deckId: string) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Você precisa estar logado.");

  const user = await prisma.user.findUnique({ where: { username: session.user.name } });
  if (!user) throw new Error("Usuário não encontrado.");

  const deck = await prisma.deck.findUnique({ where: { id: deckId } });
  if (!deck) throw new Error("Deck não encontrado.");
  if (deck.userId !== user.id) throw new Error("Este deck não é seu.");

  await prisma.deck.delete({ where: { id: deckId } });

  revalidatePath("/decks");
}

/**
 * Adiciona +1 cópia da carta no deck.
 */
export async function addCardToDeckAction(deckId: string, cardId: string) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Você precisa estar logado.");

  const user = await prisma.user.findUnique({ where: { username: session.user.name } });
  if (!user) throw new Error("Usuário não encontrado.");

  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: { cards: true },
  });
  if (!deck) throw new Error("Deck não encontrado.");
  if (deck.userId !== user.id) throw new Error("Este deck não é seu.");

  const settings = await prisma.gameSettings.upsert({
    where: { id: "singleton" }, update: {}, create: { id: "singleton" },
  });
  if (deck.cards.length >= settings.maxCardsPerDeck) {
    throw new Error(`Deck cheio (${settings.maxCardsPerDeck} cartas máximo).`);
  }

  // Simula adicionar e valida tudo (posse + limite por carta + facção)
  const newCardIds = [...deck.cards.map((c) => c.cardId), cardId];
  await validateDeckCards({
    userId: user.id,
    factionId: deck.factionId,
    cardIds: newCardIds,
  });

  await prisma.deckCard.create({
    data: { deckId, cardId },
  });

  revalidatePath(`/decks/${deckId}`);
}

/**
 * Remove 1 cópia da carta do deck (a primeira encontrada).
 */
export async function removeCardFromDeckAction(deckId: string, cardId: string) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Você precisa estar logado.");

  const user = await prisma.user.findUnique({ where: { username: session.user.name } });
  if (!user) throw new Error("Usuário não encontrado.");

  const deck = await prisma.deck.findUnique({ where: { id: deckId } });
  if (!deck) throw new Error("Deck não encontrado.");
  if (deck.userId !== user.id) throw new Error("Este deck não é seu.");

  const entry = await prisma.deckCard.findFirst({
    where: { deckId, cardId },
  });
  if (!entry) throw new Error("Carta não está no deck.");

  await prisma.deckCard.delete({ where: { id: entry.id } });

  revalidatePath(`/decks/${deckId}`);
}

/**
 * Troca o líder do deck. Se a nova facção for diferente, REMOVE
 * todas as cartas que não pertencem à nova facção (e nem são neutras).
 */
export async function changeDeckLeaderAction(deckId: string, newLeaderCardId: string) {
  const session = await auth();
  if (!session?.user?.name) throw new Error("Você precisa estar logado.");

  const [user, leaderCard, neutralFaction] = await Promise.all([
    prisma.user.findUnique({ where: { username: session.user.name } }),
    prisma.card.findUnique({ where: { id: newLeaderCardId } }),
    prisma.faction.findFirst({ where: { name: "Neutro" } }),
  ]);

  if (!user) throw new Error("Usuário não encontrado.");
  if (!leaderCard) throw new Error("Líder não encontrado.");
  if (leaderCard.cardType !== "LEADER") throw new Error("A carta escolhida não é um líder.");

  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: { cards: { include: { card: true } } },
  });
  if (!deck) throw new Error("Deck não encontrado.");
  if (deck.userId !== user.id) throw new Error("Este deck não é seu.");

  // Verifica posse do novo líder
  const ownership = await prisma.userCollection.findUnique({
    where: { userId_cardId: { userId: user.id, cardId: newLeaderCardId } },
  });
  if (!ownership || ownership.quantity < 1) {
    throw new Error("Você não possui esse líder na sua coleção.");
  }

  // Se mudou de facção, remove cartas inválidas
  const incompatibleIds: string[] = [];
  if (leaderCard.factionId !== deck.factionId) {
    for (const c of deck.cards) {
      const isNeutral = neutralFaction && c.card.factionId === neutralFaction.id;
      if (c.card.factionId !== leaderCard.factionId && !isNeutral) {
        incompatibleIds.push(c.id);
      }
    }
  }

  await prisma.$transaction([
    ...(incompatibleIds.length > 0
      ? [prisma.deckCard.deleteMany({ where: { id: { in: incompatibleIds } } })]
      : []),
    prisma.deck.update({
      where: { id: deckId },
      data:  { factionId: leaderCard.factionId },
    }),
    prisma.deckLeader.upsert({
      where:  { deckId },
      update: { cardId: newLeaderCardId },
      create: { deckId, cardId: newLeaderCardId },
    }),
  ]);

  revalidatePath(`/decks/${deckId}`);
}