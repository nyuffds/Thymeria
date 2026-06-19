-- CreateTable
CREATE TABLE "PendingRevenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "damage" INTEGER NOT NULL,
    "sourceName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PendingRevenge_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PendingRevenge_matchId_idx" ON "PendingRevenge"("matchId");

-- CreateIndex
CREATE INDEX "PendingRevenge_matchId_side_idx" ON "PendingRevenge"("matchId", "side");
