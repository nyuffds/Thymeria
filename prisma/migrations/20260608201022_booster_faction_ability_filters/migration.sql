-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "guaranteeRareOrBetter" BOOLEAN NOT NULL DEFAULT false,
    "factionFiltersCsv" TEXT,
    "abilityFiltersCsv" TEXT,
    "includeNeutro" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Booster" ("createdAt", "description", "guaranteeRareOrBetter", "id", "imageUrl", "isActive", "name", "price", "updatedAt") SELECT "createdAt", "description", "guaranteeRareOrBetter", "id", "imageUrl", "isActive", "name", "price", "updatedAt" FROM "Booster";
DROP TABLE "Booster";
ALTER TABLE "new_Booster" RENAME TO "Booster";
CREATE UNIQUE INDEX "Booster_name_key" ON "Booster"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
