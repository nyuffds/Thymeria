import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { DeckBuilder } from "./_components/DeckBuilder";

const prisma = new PrismaClient();

export default async function EditarDeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) redirect("/login");

  const deck = await prisma.deck.findUnique({
    where: { id },
    include: {
      faction: true,
      leader:  { include: { card: { include: { faction: true } } } },
      cards:   { include: { card: { include: { faction: true, ability: true } } } },
    },
  });
  if (!deck) notFound();
  if (deck.userId !== user.id) redirect("/decks");

  const [settings, neutralFaction] = await Promise.all([
    prisma.gameSettings.upsert({
      where:  { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    }),
    prisma.faction.findFirst({ where: { name: "Neutro" } }),
  ]);

  // Coleção elegível: cartas que pertencem à facção do deck OU neutras,
  // tipo UNIT ou SPECIAL (não LEADER), liberadas, e que o jogador possui
  const eligibleFactionIds = [deck.factionId];
  if (neutralFaction && neutralFaction.id !== deck.factionId) {
    eligibleFactionIds.push(neutralFaction.id);
  }

  const ownedEntries = await prisma.userCollection.findMany({
    where: {
      userId: user.id,
      quantity: { gt: 0 },
      card: {
        factionId: { in: eligibleFactionIds },
        cardType:  { in: ["UNIT", "SPECIAL"] },
        isReleased: true,
      },
    },
    include: {
      card: { include: { faction: true, ability: true } },
    },
    orderBy: [{ card: { rarity: "asc" } }, { card: { name: "asc" } }],
  });

  // Líderes que o jogador possui (pra trocar líder)
  const ownedLeaders = await prisma.userCollection.findMany({
    where: {
      userId: user.id,
      quantity: { gt: 0 },
      card: { cardType: "LEADER", isReleased: true },
    },
    include: {
      card: { include: { faction: true } },
    },
    orderBy: { card: { name: "asc" } },
  });

  // Conta quantas cópias de cada carta estão no deck
  const usageInDeck = new Map<string, number>();
  for (const dc of deck.cards) {
    usageInDeck.set(dc.cardId, (usageInDeck.get(dc.cardId) ?? 0) + 1);
  }

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
      <Link href="/decks" className="text-sm text-zinc-500 hover:text-amber-200">
        ← Meus decks
      </Link>

      <DeckBuilder
        deck={{
          id: deck.id,
          name: deck.name,
          faction: { id: deck.faction.id, name: deck.faction.name, color: deck.faction.color },
          leader: deck.leader
            ? {
                cardId: deck.leader.card.id,
                name: deck.leader.card.name,
                imageUrl: deck.leader.card.imageUrl,
                faction: { name: deck.leader.card.faction.name, color: deck.leader.card.faction.color },
              }
            : null,
          cards: deck.cards.map((dc) => ({
            cardId: dc.card.id,
            name: dc.card.name,
            power: dc.card.power,
            rows: dc.card.rows,
            rarity: dc.card.rarity,
            cardType: dc.card.cardType,
            loreText: dc.card.loreText,
            imageUrl: dc.card.imageUrl,
            faction: { name: dc.card.faction.name, color: dc.card.faction.color },
            ability: dc.card.ability ? { name: dc.card.ability.name, description: dc.card.ability.description } : null,
          })),
        }}
        collection={ownedEntries.map((e) => ({
          cardId: e.card.id,
          quantityOwned: e.quantity,
          quantityInDeck: usageInDeck.get(e.card.id) ?? 0,
          card: {
            id: e.card.id,
            name: e.card.name,
            power: e.card.power,
            rows: e.card.rows,
            rarity: e.card.rarity,
            cardType: e.card.cardType,
            loreText: e.card.loreText,
            imageUrl: e.card.imageUrl,
            faction: { name: e.card.faction.name, color: e.card.faction.color },
            ability: e.card.ability ? { name: e.card.ability.name, description: e.card.ability.description } : null,
            sellPriceOverride: e.card.sellPriceOverride,
            maxPerDeckOverride: e.card.maxPerDeckOverride,
          },
        }))}
        availableLeaders={ownedLeaders.map((l) => ({
          cardId: l.card.id,
          name: l.card.name,
          imageUrl: l.card.imageUrl,
          faction: { id: l.card.factionId, name: l.card.faction.name, color: l.card.faction.color },
        }))}
        settings={{
          minCards: settings.minCardsPerDeck,
          maxCards: settings.maxCardsPerDeck,
          maxPerRarity: {
            COMMON:    settings.maxPerDeckCommon,
            RARE:      settings.maxPerDeckRare,
            EPIC:      settings.maxPerDeckEpic,
            LEGENDARY: settings.maxPerDeckLegendary,
          },
        }}
      />
    </main>
  );
}