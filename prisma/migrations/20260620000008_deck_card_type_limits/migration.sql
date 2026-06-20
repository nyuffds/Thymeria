-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GameSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "sellPriceCommon" INTEGER NOT NULL DEFAULT 5,
    "sellPriceRare" INTEGER NOT NULL DEFAULT 20,
    "sellPriceEpic" INTEGER NOT NULL DEFAULT 60,
    "sellPriceLegendary" INTEGER NOT NULL DEFAULT 150,
    "maxPerDeckCommon" INTEGER NOT NULL DEFAULT 3,
    "maxPerDeckRare" INTEGER NOT NULL DEFAULT 2,
    "maxPerDeckEpic" INTEGER NOT NULL DEFAULT 1,
    "maxPerDeckLegendary" INTEGER NOT NULL DEFAULT 1,
    "allowSellLastCopy" BOOLEAN NOT NULL DEFAULT false,
    "pityThresholdCommon" INTEGER NOT NULL DEFAULT 3,
    "pityThresholdRare" INTEGER NOT NULL DEFAULT 5,
    "pityThresholdEpic" INTEGER NOT NULL DEFAULT 3,
    "pityThresholdLegendary" INTEGER NOT NULL DEFAULT 2,
    "maxDecksPerPlayer" INTEGER NOT NULL DEFAULT 5,
    "minCardsPerDeck" INTEGER NOT NULL DEFAULT 20,
    "maxCardsPerDeck" INTEGER NOT NULL DEFAULT 30,
    "minUnitsPerDeck" INTEGER NOT NULL DEFAULT 15,
    "maxUnitsPerDeck" INTEGER NOT NULL DEFAULT 30,
    "minSpecialsPerDeck" INTEGER NOT NULL DEFAULT 0,
    "maxSpecialsPerDeck" INTEGER NOT NULL DEFAULT 10,
    "minWeathersPerDeck" INTEGER NOT NULL DEFAULT 0,
    "maxWeathersPerDeck" INTEGER NOT NULL DEFAULT 5,
    "marketFeePercent" REAL NOT NULL DEFAULT 0.05,
    "gameName" TEXT NOT NULL DEFAULT 'Thymeria',
    "gameSubtitle" TEXT NOT NULL DEFAULT 'Era da Restauracao - Um seculo apos a Guerra do Fim',
    "landingTagline" TEXT NOT NULL DEFAULT 'Os ventos de Thymeria sopram cantos de glória e ruína.',
    "landingFooterLore" TEXT NOT NULL DEFAULT 'Thymeria descansa sob a luz de Lugh e a vigilia de Morrigan. Skanda venceu Eris na Guerra do Fim, mas suas centelhas ainda dancam pelos reinos. Que sua jornada seja digna das cancoes que serao escritas em Lomerel.',
    "landingBackgroundUrl" TEXT,
    "themePrimaryColor" TEXT NOT NULL DEFAULT '#d4a04a',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_GameSettings" ("allowSellLastCopy", "gameName", "gameSubtitle", "id", "landingBackgroundUrl", "landingFooterLore", "landingTagline", "marketFeePercent", "maxCardsPerDeck", "maxDecksPerPlayer", "maxPerDeckCommon", "maxPerDeckEpic", "maxPerDeckLegendary", "maxPerDeckRare", "minCardsPerDeck", "pityThresholdCommon", "pityThresholdEpic", "pityThresholdLegendary", "pityThresholdRare", "sellPriceCommon", "sellPriceEpic", "sellPriceLegendary", "sellPriceRare", "themePrimaryColor", "updatedAt") SELECT "allowSellLastCopy", "gameName", "gameSubtitle", "id", "landingBackgroundUrl", "landingFooterLore", "landingTagline", "marketFeePercent", "maxCardsPerDeck", "maxDecksPerPlayer", "maxPerDeckCommon", "maxPerDeckEpic", "maxPerDeckLegendary", "maxPerDeckRare", "minCardsPerDeck", "pityThresholdCommon", "pityThresholdEpic", "pityThresholdLegendary", "pityThresholdRare", "sellPriceCommon", "sellPriceEpic", "sellPriceLegendary", "sellPriceRare", "themePrimaryColor", "updatedAt" FROM "GameSettings";
DROP TABLE "GameSettings";
ALTER TABLE "new_GameSettings" RENAME TO "GameSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
