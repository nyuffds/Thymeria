-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL DEFAULT 'HOTSEAT',
    "status" TEXT NOT NULL DEFAULT 'SETUP',
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "currentTurnSide" TEXT,
    "winnerSide" TEXT,
    "startsRoundSide" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "finishedAt" DATETIME,
    "lobbyOpen" BOOLEAN NOT NULL DEFAULT false,
    "creatorUserId" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Match" ("createdAt", "currentRound", "currentTurnSide", "finishedAt", "id", "mode", "startsRoundSide", "status", "updatedAt", "winnerSide") SELECT "createdAt", "currentRound", "currentTurnSide", "finishedAt", "id", "mode", "startsRoundSide", "status", "updatedAt", "winnerSide" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE INDEX "Match_status_idx" ON "Match"("status");
CREATE TABLE "new_MatchPlayer" (
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
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connectionStatus" TEXT NOT NULL DEFAULT 'ONLINE',
    CONSTRAINT "MatchPlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MatchPlayer_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MatchPlayer" ("deckCardCount", "deckId", "hasPassed", "id", "leaderUsed", "matchId", "redrawsLeft", "roundsWon", "side", "userId") SELECT "deckCardCount", "deckId", "hasPassed", "id", "leaderUsed", "matchId", "redrawsLeft", "roundsWon", "side", "userId" FROM "MatchPlayer";
DROP TABLE "MatchPlayer";
ALTER TABLE "new_MatchPlayer" RENAME TO "MatchPlayer";
CREATE INDEX "MatchPlayer_matchId_idx" ON "MatchPlayer"("matchId");
CREATE UNIQUE INDEX "MatchPlayer_matchId_side_key" ON "MatchPlayer"("matchId", "side");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
