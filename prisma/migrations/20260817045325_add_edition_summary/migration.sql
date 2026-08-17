-- CreateTable
CREATE TABLE "EditionSummary" (
    "editionId" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalUsers" INTEGER NOT NULL,
    "newSignups" INTEGER NOT NULL,
    "activeUsers" INTEGER NOT NULL,
    "postsCount" INTEGER NOT NULL,
    "wordsWritten" INTEGER NOT NULL,
    "wordsRead" INTEGER NOT NULL,
    "funnelAllUsers" INTEGER NOT NULL,
    "funnelActive" INTEGER NOT NULL,
    "funnelOpened" INTEGER NOT NULL,
    "funnelRead" INTEGER NOT NULL,
    "funnelReadAll" INTEGER NOT NULL,
    "funnelCommented" INTEGER NOT NULL,
    "funnelWrote" INTEGER NOT NULL,

    CONSTRAINT "EditionSummary_pkey" PRIMARY KEY ("editionId")
);

-- AddForeignKey
ALTER TABLE "EditionSummary" ADD CONSTRAINT "EditionSummary_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
