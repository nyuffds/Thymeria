-- CreateTable
CREATE TABLE "UnopenedBooster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "boosterId" TEXT NOT NULL,
    "pricePaid" INTEGER NOT NULL,
    "acquiredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnopenedBooster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnopenedBooster_boosterId_fkey" FOREIGN KEY ("boosterId") REFERENCES "Booster" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UnopenedBooster_userId_idx" ON "UnopenedBooster"("userId");
