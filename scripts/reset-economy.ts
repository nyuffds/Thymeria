// scripts/reset-economy.ts
// Reseta tudo MENOS Factions, Abilities, Users e GameSettings.
// Pra rodar: npx tsx scripts/reset-economy.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔥 Resetando banco (mantendo factions, abilities, users e settings)...\n");

  // Ordem importa: filhos antes dos pais (foreign keys)

  // ── PARTIDAS ──
  await prisma.matchEvent.deleteMany({});
  console.log("✓ MatchEvent apagado");
  await prisma.matchWeather.deleteMany({});
  console.log("✓ MatchWeather apagado");
  await prisma.matchBoardCard.deleteMany({});
  console.log("✓ MatchBoardCard apagado");
  await prisma.matchHand.deleteMany({});
  console.log("✓ MatchHand apagado");
  await prisma.matchPlayer.deleteMany({});
  console.log("✓ MatchPlayer apagado");
  await prisma.match.deleteMany({});
  console.log("✓ Match apagado");

  // ── DECKS ──
  await prisma.deckCard.deleteMany({});
  console.log("✓ DeckCard apagado");
  await prisma.deckLeader.deleteMany({});
  console.log("✓ DeckLeader apagado");
  await prisma.deck.deleteMany({});
  console.log("✓ Deck apagado");

  // ── ECONOMIA ──
  await prisma.boosterOpeningResult.deleteMany({});
  console.log("✓ BoosterOpeningResult apagado");
  await prisma.boosterOpening.deleteMany({});
  console.log("✓ BoosterOpening apagado");
  await prisma.unopenedBooster.deleteMany({});
  console.log("✓ UnopenedBooster apagado");
  await prisma.userPity.deleteMany({});
  console.log("✓ UserPity apagado");
  await prisma.transaction.deleteMany({});
  console.log("✓ Transaction apagado");
  await prisma.userCollection.deleteMany({});
  console.log("✓ UserCollection apagado");

  // ── BOOSTERS (definições) ──
  await prisma.boosterRule.deleteMany({});
  console.log("✓ BoosterRule apagado");
  await prisma.booster.deleteMany({});
  console.log("✓ Booster apagado");

  // ── CARTAS ──
  await prisma.card.deleteMany({});
  console.log("✓ Card apagado");

  // ── ZERA MOEDAS DOS USUÁRIOS ──
  const updated = await prisma.user.updateMany({
    data: { coins: 0 },
  });
  console.log("✓ Moedas zeradas pra " + updated.count + " usuário(s)");

  console.log("\n✅ Reset concluído.");
  console.log("📋 Mantidos: Users, Factions, Abilities, GameSettings");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());