-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL DEFAULT 'HOTSEAT',
    "status" TEXT NOT NULL DEFAULT 'SETUP',
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "currentTurnSide" TEXT,
    "winnerSide" TEXT,
    "startsRoundSide" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "finishedAt" DATETIME
);

-- CreateTable
CREATE TABLE "MatchPlayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "roundsWon" INTEGER NOT NULL DEFAULT 0,
    "hasPassed" BOOLEAN NOT NULL DEFAULT false,
    "leaderUsed" BOOLEAN NOT NULL DEFAULT false,
    "redrawsLeft" INTEGER NOT NULL DEFAULT 3,
    "deckCardCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MatchPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MatchPlayer_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatchHand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "zone" TEXT NOT NULL DEFAULT 'DECK',
    "deckOrder" INTEGER NOT NULL,
    CONSTRAINT "MatchHand_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchHand_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatchBoardCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "row" TEXT NOT NULL,
    "basePower" INTEGER NOT NULL,
    "power" INTEGER NOT NULL,
    "shielded" BOOLEAN NOT NULL DEFAULT false,
    "isToken" BOOLEAN NOT NULL DEFAULT false,
    "playedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchBoardCard_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchBoardCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatchWeather" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "weatherKey" TEXT NOT NULL,
    "affectedRow" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchWeather_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchWeather_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "side" TEXT,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Match_status_idx" ON "Match"("status");

-- CreateIndex
CREATE INDEX "MatchPlayer_matchId_idx" ON "MatchPlayer"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchPlayer_matchId_side_key" ON "MatchPlayer"("matchId", "side");

-- CreateIndex
CREATE INDEX "MatchHand_matchId_side_zone_idx" ON "MatchHand"("matchId", "side", "zone");

-- CreateIndex
CREATE INDEX "MatchBoardCard_matchId_side_row_idx" ON "MatchBoardCard"("matchId", "side", "row");

-- CreateIndex
CREATE INDEX "MatchWeather_matchId_idx" ON "MatchWeather"("matchId");

-- CreateIndex
CREATE INDEX "MatchEvent_matchId_idx" ON "MatchEvent"("matchId");

-- CreateIndex
CREATE INDEX "MatchEvent_matchId_round_idx" ON "MatchEvent"("matchId", "round");
