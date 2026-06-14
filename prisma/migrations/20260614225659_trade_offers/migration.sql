-- CreateTable
CREATE TABLE "TradeOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creatorUserId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "coinsOffered" INTEGER NOT NULL DEFAULT 0,
    "coinsDemanded" INTEGER NOT NULL DEFAULT 0,
    "acceptorUserId" TEXT,
    "acceptedAt" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "note" TEXT,
    CONSTRAINT "TradeOffer_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TradeOffer_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TradeOffer_acceptorUserId_fkey" FOREIGN KEY ("acceptorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TradeOfferCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offerId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "TradeOfferCard_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "TradeOffer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TradeOfferCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TradeOfferDemand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offerId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "TradeOfferDemand_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "TradeOffer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TradeOfferDemand_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TradeOffer_status_idx" ON "TradeOffer"("status");

-- CreateIndex
CREATE INDEX "TradeOffer_creatorUserId_idx" ON "TradeOffer"("creatorUserId");

-- CreateIndex
CREATE INDEX "TradeOffer_targetUserId_idx" ON "TradeOffer"("targetUserId");

-- CreateIndex
CREATE INDEX "TradeOfferCard_offerId_idx" ON "TradeOfferCard"("offerId");

-- CreateIndex
CREATE INDEX "TradeOfferCard_cardId_idx" ON "TradeOfferCard"("cardId");

-- CreateIndex
CREATE INDEX "TradeOfferDemand_offerId_idx" ON "TradeOfferDemand"("offerId");

-- CreateIndex
CREATE INDEX "TradeOfferDemand_cardId_idx" ON "TradeOfferDemand"("cardId");
