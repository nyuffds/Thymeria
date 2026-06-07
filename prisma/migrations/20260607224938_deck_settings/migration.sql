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
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_GameSettings" ("allowSellLastCopy", "id", "maxPerDeckCommon", "maxPerDeckEpic", "maxPerDeckLegendary", "maxPerDeckRare", "pityThresholdCommon", "pityThresholdEpic", "pityThresholdLegendary", "pityThresholdRare", "sellPriceCommon", "sellPriceEpic", "sellPriceLegendary", "sellPriceRare", "updatedAt") SELECT "allowSellLastCopy", "id", "maxPerDeckCommon", "maxPerDeckEpic", "maxPerDeckLegendary", "maxPerDeckRare", "pityThresholdCommon", "pityThresholdEpic", "pityThresholdLegendary", "pityThresholdRare", "sellPriceCommon", "sellPriceEpic", "sellPriceLegendary", "sellPriceRare", "updatedAt" FROM "GameSettings";
DROP TABLE "GameSettings";
ALTER TABLE "new_GameSettings" RENAME TO "GameSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
