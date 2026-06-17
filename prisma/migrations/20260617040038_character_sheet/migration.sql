-- CreateTable
CREATE TABLE "CharacterSheet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "hpCurrent" INTEGER NOT NULL DEFAULT 0,
    "hpTemp" INTEGER NOT NULL DEFAULT 0,
    "exhaustion" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CharacterSheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSheet_userId_key" ON "CharacterSheet"("userId");
