-- CreateTable
CREATE TABLE "ChargedCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "bonusPower" INTEGER NOT NULL DEFAULT 0,
    "triggersRound" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChargedCard_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "drawOfferedBy" TEXT,
    "pausedBy" TEXT,
    "pausedAt" DATETIME,
    "sealAbilitiesUntilTurn" INTEGER NOT NULL DEFAULT 0,
    "lastPlayedCardIdA" TEXT,
    "lastPlayedCardIdB" TEXT,
    "lastPlayedTargetIdA" TEXT,
    "lastPlayedTargetIdB" TEXT,
    "turnCounter" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_Match" ("createdAt", "creatorUserId", "currentRound", "currentTurnSide", "drawOfferedBy", "finishedAt", "id", "isPrivate", "lobbyOpen", "mode", "pausedAt", "pausedBy", "startsRoundSide", "status", "updatedAt", "winnerSide") SELECT "createdAt", "creatorUserId", "currentRound", "currentTurnSide", "drawOfferedBy", "finishedAt", "id", "isPrivate", "lobbyOpen", "mode", "pausedAt", "pausedBy", "startsRoundSide", "status", "updatedAt", "winnerSide" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE INDEX "Match_status_idx" ON "Match"("status");
CREATE TABLE "new_MatchBoardCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "row" TEXT NOT NULL,
    "basePower" INTEGER NOT NULL,
    "power" INTEGER NOT NULL,
    "shielded" BOOLEAN NOT NULL DEFAULT false,
    "isToken" BOOLEAN NOT NULL DEFAULT false,
    "permanenceCounter" INTEGER NOT NULL DEFAULT 0,
    "playedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handEntryId" TEXT,
    "markedBy" TEXT,
    "chainBonus" INTEGER NOT NULL DEFAULT 0,
    "oathGroup" TEXT,
    "untargetable" BOOLEAN NOT NULL DEFAULT false,
    "intercepting" BOOLEAN NOT NULL DEFAULT false,
    "loopback" BOOLEAN NOT NULL DEFAULT false,
    "reflectsNext" BOOLEAN NOT NULL DEFAULT false,
    "turnsOnBoard" INTEGER NOT NULL DEFAULT 0,
    "polymorphedUntilRound" INTEGER,
    "counterspellArmed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MatchBoardCard_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchBoardCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MatchBoardCard" ("basePower", "cardId", "chainBonus", "handEntryId", "id", "intercepting", "isToken", "loopback", "markedBy", "matchId", "oathGroup", "permanenceCounter", "playedAt", "power", "reflectsNext", "row", "shielded", "side", "untargetable") SELECT "basePower", "cardId", "chainBonus", "handEntryId", "id", "intercepting", "isToken", "loopback", "markedBy", "matchId", "oathGroup", "permanenceCounter", "playedAt", "power", "reflectsNext", "row", "shielded", "side", "untargetable" FROM "MatchBoardCard";
DROP TABLE "MatchBoardCard";
ALTER TABLE "new_MatchBoardCard" RENAME TO "MatchBoardCard";
CREATE INDEX "MatchBoardCard_matchId_side_row_idx" ON "MatchBoardCard"("matchId", "side", "row");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ChargedCard_matchId_idx" ON "ChargedCard"("matchId");

-- CreateIndex
CREATE INDEX "ChargedCard_matchId_triggersRound_idx" ON "ChargedCard"("matchId", "triggersRound");
