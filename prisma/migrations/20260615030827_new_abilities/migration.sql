-- CreateTable
CREATE TABLE "MatchAura" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "engineKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchAura_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    CONSTRAINT "MatchBoardCard_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchBoardCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MatchBoardCard" ("basePower", "cardId", "handEntryId", "id", "isToken", "matchId", "playedAt", "power", "row", "shielded", "side") SELECT "basePower", "cardId", "handEntryId", "id", "isToken", "matchId", "playedAt", "power", "row", "shielded", "side" FROM "MatchBoardCard";
DROP TABLE "MatchBoardCard";
ALTER TABLE "new_MatchBoardCard" RENAME TO "MatchBoardCard";
CREATE INDEX "MatchBoardCard_matchId_side_row_idx" ON "MatchBoardCard"("matchId", "side", "row");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "MatchAura_matchId_side_idx" ON "MatchAura"("matchId", "side");
