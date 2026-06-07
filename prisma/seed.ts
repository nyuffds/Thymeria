// prisma/seed.ts
// Popula o banco com os 7 usuários iniciais (1 admin + 6 jogadores).
// Pode ser rodado várias vezes sem duplicar (usa upsert).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USERS = [
  { username: "Levy",     role: "ADMIN"  },
  { username: "Alucios",  role: "PLAYER" },
  { username: "Yue",      role: "PLAYER" },
  { username: "Az",       role: "PLAYER" },
  { username: "Thalyria", role: "PLAYER" },
  { username: "Jogador5", role: "PLAYER" },
  { username: "Jogador6", role: "PLAYER" },
];

async function main() {
  console.log("🌱 Iniciando seed...");

  for (const u of USERS) {
    const result = await prisma.user.upsert({
      where:  { username: u.username },
      update: { role: u.role },              // se já existe, só garante a role correta
      create: { username: u.username, role: u.role, passwordHash: null },
    });
    console.log(`  ✓ ${result.role.padEnd(6)} → ${result.username}`);
  }

  console.log("✅ Seed concluído.");
}

main()
  .catch((e) => { console.error("❌ Erro no seed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });