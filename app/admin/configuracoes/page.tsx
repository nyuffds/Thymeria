export const dynamic = "force-dynamic";

import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { SettingsForm } from "./_components/SettingsForm";

const prisma = new PrismaClient();

export default async function ConfiguracoesPage() {
  const settings = await prisma.gameSettings.upsert({
    where:  { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <Link href="/admin" className="text-sm text-zinc-500 hover:text-amber-200">
        ← Painel
      </Link>
      <h1 className="text-3xl font-bold text-amber-200 mt-1 mb-2 font-heading">Configurações</h1>
      <p className="text-zinc-400 mb-6">Regras globais do jogo.</p>

      <SettingsForm
        initial={{
          sellPriceCommon: settings.sellPriceCommon,
          sellPriceRare: settings.sellPriceRare,
          sellPriceEpic: settings.sellPriceEpic,
          sellPriceLegendary: settings.sellPriceLegendary,
          maxPerDeckCommon: settings.maxPerDeckCommon,
          maxPerDeckRare: settings.maxPerDeckRare,
          maxPerDeckEpic: settings.maxPerDeckEpic,
          maxPerDeckLegendary: settings.maxPerDeckLegendary,
          allowSellLastCopy: settings.allowSellLastCopy,
          pityThresholdCommon: settings.pityThresholdCommon,
          pityThresholdRare: settings.pityThresholdRare,
          pityThresholdEpic: settings.pityThresholdEpic,
          pityThresholdLegendary: settings.pityThresholdLegendary,
          maxDecksPerPlayer: settings.maxDecksPerPlayer,
          minCardsPerDeck: settings.minCardsPerDeck,
          maxCardsPerDeck: settings.maxCardsPerDeck,
        }}
      />
    </main>
  );
}