-- CreateTable
CREATE TABLE "MatchRowImmunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "row" TEXT NOT NULL,
    "turnsLeft" INTEGER NOT NULL,
    "appliedRound" INTEGER NOT NULL,
    "appliedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MatchRowImmunity_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MatchRowImmunity_matchId_idx" ON "MatchRowImmunity"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchRowImmunity_matchId_side_row_key" ON "MatchRowImmunity"("matchId", "side", "row");
