-- CreateTable
CREATE TABLE "EditionView" (
    "editionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EditionView_pkey" PRIMARY KEY ("editionId","userId")
);

-- CreateIndex
CREATE INDEX "EditionView_editionId_idx" ON "EditionView"("editionId");

-- AddForeignKey
ALTER TABLE "EditionView" ADD CONSTRAINT "EditionView_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditionView" ADD CONSTRAINT "EditionView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
