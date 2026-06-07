-- CreateTable
CREATE TABLE "UserPity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_GameSettings" ("allowSellLastCopy", "id", "maxPerDeckCommon", "maxPerDeckEpic", "maxPerDeckLegendary", "maxPerDeckRare", "sellPriceCommon", "sellPriceEpic", "sellPriceLegendary", "sellPriceRare", "updatedAt") SELECT "allowSellLastCopy", "id", "maxPerDeckCommon", "maxPerDeckEpic", "maxPerDeckLegendary", "maxPerDeckRare", "sellPriceCommon", "sellPriceEpic", "sellPriceLegendary", "sellPriceRare", "updatedAt" FROM "GameSettings";
DROP TABLE "GameSettings";
ALTER TABLE "new_GameSettings" RENAME TO "GameSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "UserPity_userId_idx" ON "UserPity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPity_userId_rarity_key" ON "UserPity"("userId", "rarity");
