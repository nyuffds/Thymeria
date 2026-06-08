import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const session = await auth();
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { username: session.user.name },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  const settings = await prisma.gameSettings.upsert({
    where: { id: "singleton" }, update: {}, create: { id: "singleton" },
  });

  const allDecks = await prisma.deck.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    include: {
      faction: true,
      leader: { include: { card: true } },
      _count: { select: { cards: true } },
    },
  });

  const playable = allDecks
    .filter((d) => d.leader)
    .filter((d) => d._count.cards >= settings.minCardsPerDeck)
    .filter((d) => d._count.cards <= settings.maxCardsPerDeck)
    .map((d) => ({
      id: d.id,
      name: d.name,
      factionName: d.faction.name,
      factionColor: d.faction.color,
      leaderName: d.leader!.card.name,
      cardCount: d._count.cards,
    }));

  return NextResponse.json({ decks: playable });
}