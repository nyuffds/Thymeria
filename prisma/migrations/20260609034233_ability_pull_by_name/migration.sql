-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Ability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "engineKey" TEXT,
    "engineValue" INTEGER,
    "targetCardIdsCsv" TEXT,
    "triggerMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Ability" ("createdAt", "description", "engineKey", "engineValue", "id", "isActive", "name", "updatedAt") SELECT "createdAt", "description", "engineKey", "engineValue", "id", "isActive", "name", "updatedAt" FROM "Ability";
DROP TABLE "Ability";
ALTER TABLE "new_Ability" RENAME TO "Ability";
CREATE UNIQUE INDEX "Ability_name_key" ON "Ability"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
