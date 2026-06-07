-- CreateTable
CREATE TABLE "GameSettings" (
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
    "updatedAt" DATETIME NOT NULL
);
