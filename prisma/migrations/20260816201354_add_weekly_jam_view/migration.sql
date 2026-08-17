-- CreateTable
CREATE TABLE "WeeklyJamView" (
    "editionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyJamView_pkey" PRIMARY KEY ("editionId","userId")
);

-- CreateIndex
CREATE INDEX "WeeklyJamView_editionId_idx" ON "WeeklyJamView"("editionId");

-- AddForeignKey
ALTER TABLE "WeeklyJamView" ADD CONSTRAINT "WeeklyJamView_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyJamView" ADD CONSTRAINT "WeeklyJamView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
