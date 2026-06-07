// prisma/seed.ts
// Popula o banco com dados iniciais:
//   - 7 usuários (1 admin + 6 jogadores)
//   - 8 facções de Thymeria
//   - 6 habilidades base com engineKey
// Pode ser rodado várias vezes sem duplicar (usa upsert por nome).

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

const FACTIONS = [
  { name: "Valtres",   color: "#5dade2", description: "Reino do norte glacial, terra dos cavaleiros." },
  { name: "Kaldaey",   color: "#1a5276", description: "Ilhas do extremo norte, povo do mar e do gelo." },
  { name: "A'Ralith",  color: "#27ae60", description: "Floresta antiga, lar dos druidas e silvestres." },
  { name: "Lómerel",   color: "#b76e5f", description: "Reino oriental, berço de magos e eruditos." },
  { name: "Solkaran",  color: "#e67e22", description: "Cidade-estado das Três Irmãs, mercadores e marinheiros." },
  { name: "Qadesh",    color: "#c0392b", description: "Cidade-estado das Três Irmãs, terra de guerreiros e tradição." },
  { name: "Velquar",   color: "#8e44ad", description: "Cidade-estado das Três Irmãs, cortes e intrigas." },
  { name: "Neutro",    color: "#95a5a6", description: "Cartas sem vínculo de facção." },
];

const ABILITIES = [
  {
    name: "Reforço",
    description: "Aumenta o poder de uma carta aliada em +2.",
    engineKey: "BOOST",
    engineValue: 2,
  },
  {
    name: "Investida",
    description: "Causa 2 de dano a uma carta inimiga.",
    engineKey: "DAMAGE",
    engineValue: 2,
  },
  {
    name: "Convocar Aliado",
    description: "Invoca uma cópia de menor poder ao ser jogada.",
    engineKey: "SPAWN",
    engineValue: 1,
  },
  {
    name: "Vínculo",
    description: "Quando há cópias na mesma fileira, todas ganham +1 de poder.",
    engineKey: "BOND",
    engineValue: 1,
  },
  {
    name: "Espião",
    description: "Joga-se no lado inimigo; compra 2 cartas do baralho.",
    engineKey: "SPY",
    engineValue: 2,
  },
  {
    name: "Vidência",
    description: "Ao ser jogada, compra 1 carta do baralho.",
    engineKey: "DRAW",
    engineValue: 1,
  },
];

async function main() {
  console.log("🌱 Iniciando seed...");

  console.log("\n👤 Usuários:");
  for (const u of USERS) {
    const r = await prisma.user.upsert({
      where:  { username: u.username },
      update: { role: u.role },
      create: { username: u.username, role: u.role, passwordHash: null },
    });
    console.log(`  ✓ ${r.role.padEnd(6)} → ${r.username}`);
  }

  console.log("\n🏴 Facções:");
  for (const f of FACTIONS) {
    const r = await prisma.faction.upsert({
      where:  { name: f.name },
      update: { color: f.color, description: f.description },
      create: f,
    });
    console.log(`  ✓ ${r.color} → ${r.name}`);
  }

  console.log("\n⚡ Habilidades:");
  for (const a of ABILITIES) {
    const r = await prisma.ability.upsert({
      where:  { name: a.name },
      update: { description: a.description, engineKey: a.engineKey, engineValue: a.engineValue },
      create: a,
    });
    console.log(`  ✓ ${(r.engineKey ?? "—").padEnd(7)} → ${r.name}`);
  }

  console.log("\n✅ Seed concluído.");
}

main()
  .catch((e) => { console.error("❌ Erro no seed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });