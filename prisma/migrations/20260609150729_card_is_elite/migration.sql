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
INSERT INTO "new_Card" ("abilityId", "cardType", "createdAt", "factionId", "frameUrl", "id", "imageUrl", "isReleased", "leaderMode", "loreText", "maxPerDeckOverride", "name", "power", "rarity", "rows", "sellPriceOverride", "updatedAt") SELECT "abilityId", "cardType", "createdAt", "factionId", "frameUrl", "id", "imageUrl", "isReleased", "leaderMode", "loreText", "maxPerDeckOverride", "name", "power", "rarity", "rows", "sellPriceOverride", "updatedAt" FROM "Card";
DROP TABLE "Card";
ALTER TABLE "new_Card" RENAME TO "Card";
CREATE UNIQUE INDEX "Card_name_key" ON "Card"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
