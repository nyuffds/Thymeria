-- AlterTable
ALTER TABLE "Card" ADD COLUMN "maxPerDeckOverride" INTEGER;
ALTER TABLE "Card" ADD COLUMN "sellPriceOverride" INTEGER;

-- CreateTable
CREATE TABLE "UserCollection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserCollection_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Booster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BoosterRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boosterId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "rarity" TEXT,
    "cardId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "BoosterRule_boosterId_fkey" FOREIGN KEY ("boosterId") REFERENCES "Booster" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BoosterRule_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BoosterOpening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "boosterId" TEXT NOT NULL,
    "pricePaid" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BoosterOpening_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BoosterOpening_boosterId_fkey" FOREIGN KEY ("boosterId") REFERENCES "Booster" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BoosterOpeningResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "openingId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "wasNew" BOOLEAN NOT NULL,
    CONSTRAINT "BoosterOpeningResult_openingId_fkey" FOREIGN KEY ("openingId") REFERENCES "BoosterOpening" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BoosterOpeningResult_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "coins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "id", "passwordHash", "role", "updatedAt", "username") SELECT "createdAt", "id", "passwordHash", "role", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "UserCollection_userId_idx" ON "UserCollection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCollection_userId_cardId_key" ON "UserCollection"("userId", "cardId");

-- CreateIndex
CREATE UNIQUE INDEX "Booster_name_key" ON "Booster"("name");

-- CreateIndex
CREATE INDEX "BoosterRule_boosterId_idx" ON "BoosterRule"("boosterId");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "BoosterOpening_userId_idx" ON "BoosterOpening"("userId");

-- CreateIndex
CREATE INDEX "BoosterOpening_createdAt_idx" ON "BoosterOpening"("createdAt");

-- CreateIndex
CREATE INDEX "BoosterOpeningResult_openingId_idx" ON "BoosterOpeningResult"("openingId");
