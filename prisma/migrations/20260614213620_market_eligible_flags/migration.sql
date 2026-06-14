-- CreateTable
CREATE TABLE "MarketListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerUserId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricePerUnit" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "soldAt" DATETIME,
    "buyerUserId" TEXT,
    CONSTRAINT "MarketListing_sellerUserId_fkey" FOREIGN KEY ("sellerUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MarketListing_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MarketListing_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "power" INTEGER NOT NULL,
    "rows" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'COMMON',
    "cardType" TEXT NOT NULL DEFAULT 'UNIT',
    "isElite" BOOLEAN NOT NULL DEFAULT false,
    "leaderMode" TEXT,
    "loreText" TEXT,
    "imageUrl" TEXT,
    "isReleased" BOOLEAN NOT NULL DEFAULT true,
    "marketEligible" BOOLEAN NOT NULL DEFAULT true,
    "boosterEligible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "frameUrl" TEXT,
    "factionId" TEXT NOT NULL,
    "abilityId" TEXT,
    "sellPriceOverride" INTEGER,
    "maxPerDeckOverride" INTEGER,
    CONSTRAINT "Card_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Card_abilityId_fkey" FOREIGN KEY ("abilityId") REFERENCES "Ability" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Card" ("abilityId", "cardType", "createdAt", "factionId", "frameUrl", "id", "imageUrl", "isElite", "isReleased", "leaderMode", "loreText", "maxPerDeckOverride", "name", "power", "rarity", "rows", "sellPriceOverride", "updatedAt") SELECT "abilityId", "cardType", "createdAt", "factionId", "frameUrl", "id", "imageUrl", "isElite", "isReleased", "leaderMode", "loreText", "maxPerDeckOverride", "name", "power", "rarity", "rows", "sellPriceOverride", "updatedAt" FROM "Card";
DROP TABLE "Card";
ALTER TABLE "new_Card" RENAME TO "Card";
CREATE UNIQUE INDEX "Card_name_key" ON "Card"("name");
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
    "marketFeePercent" REAL NOT NULL DEFAULT 0.05,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_GameSettings" ("allowSellLastCopy", "id", "maxCardsPerDeck", "maxDecksPerPlayer", "maxPerDeckCommon", "maxPerDeckEpic", "maxPerDeckLegendary", "maxPerDeckRare", "minCardsPerDeck", "pityThresholdCommon", "pityThresholdEpic", "pityThresholdLegendary", "pityThresholdRare", "sellPriceCommon", "sellPriceEpic", "sellPriceLegendary", "sellPriceRare", "updatedAt") SELECT "allowSellLastCopy", "id", "maxCardsPerDeck", "maxDecksPerPlayer", "maxPerDeckCommon", "maxPerDeckEpic", "maxPerDeckLegendary", "maxPerDeckRare", "minCardsPerDeck", "pityThresholdCommon", "pityThresholdEpic", "pityThresholdLegendary", "pityThresholdRare", "sellPriceCommon", "sellPriceEpic", "sellPriceLegendary", "sellPriceRare", "updatedAt" FROM "GameSettings";
DROP TABLE "GameSettings";
ALTER TABLE "new_GameSettings" RENAME TO "GameSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "MarketListing_status_idx" ON "MarketListing"("status");

-- CreateIndex
CREATE INDEX "MarketListing_sellerUserId_idx" ON "MarketListing"("sellerUserId");

-- CreateIndex
CREATE INDEX "MarketListing_cardId_idx" ON "MarketListing"("cardId");
