export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { CardDetailWithSell } from "./_components/CardDetailWithSell";

const prisma = new PrismaClient();

export default async function ColecaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.name) redirect("/login");

  const { id } = await params;

  const [user, settings] = await Promise.all([
    prisma.user.findUnique({ where: { username: session.user.name } }),
    prisma.gameSettings.upsert({
      where:  { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    }),
  ]);
  if (!user) redirect("/login");

  const [card, entry] = await Promise.all([
    prisma.card.findUnique({
      where: { id },
      include: { faction: true, ability: true },
    }),
    prisma.userCollection.findUnique({
      where: { userId_cardId: { userId: user.id, cardId: id } },
    }),
  ]);

  if (!card) notFound();
  if (!entry || entry.quantity < 1) {
    // Jogador não tem essa carta — redireciona pra coleção
    redirect("/colecao");
  }

  // Calcula preço unitário de venda
  const defaultByRarity: Record<string, number> = {
    COMMON:    settings.sellPriceCommon,
    RARE:      settings.sellPriceRare,
    EPIC:      settings.sellPriceEpic,
    LEGENDARY: settings.sellPriceLegendary,
  };
  const unitPrice = card.sellPriceOverride ?? defaultByRarity[card.rarity] ?? 0;

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
      <Link href="/colecao" className="text-sm text-zinc-500 hover:text-amber-200">
        ← Minha coleção
      </Link>

      <CardDetailWithSell
        card={{
          id: card.id,
          name: card.name,
          power: card.power,
          rows: card.rows,
          rarity: card.rarity,
          cardType: card.cardType,
          loreText: card.loreText,
          imageUrl: card.imageUrl,
          frameUrl: card.frameUrl,
          faction: { name: card.faction.name, color: card.faction.color },
          ability: card.ability
            ? { name: card.ability.name, description: card.ability.description }
            : null,
        }}
        quantity={entry.quantity}
        unitPrice={unitPrice}
        allowSellLastCopy={settings.allowSellLastCopy}
      />
    </main>
  );
}