-- CreateTable
CREATE TABLE "PantheonDeity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alignment" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#c9a961',
    "quote" TEXT,
    "quoteSource" TEXT,
    "loreText" TEXT,
    "imageUrl" TEXT,
    "famousDevotees" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PantheonDeity_slug_key" ON "PantheonDeity"("slug");

-- CreateIndex
CREATE INDEX "PantheonDeity_alignment_idx" ON "PantheonDeity"("alignment");

-- CreateIndex
CREATE INDEX "PantheonDeity_displayOrder_idx" ON "PantheonDeity"("displayOrder");
