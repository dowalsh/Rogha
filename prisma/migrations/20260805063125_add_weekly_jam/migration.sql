-- AlterTable
ALTER TABLE "User" ADD COLUMN     "jamEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastfmUsername" TEXT;

-- CreateTable
CREATE TABLE "WeeklyTrack" (
    "editionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "playCount" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "imageSource" TEXT,
    "spotifySearchUrl" TEXT NOT NULL,
    "lastfmUrl" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyTrack_pkey" PRIMARY KEY ("editionId","userId")
);

-- CreateIndex
CREATE INDEX "WeeklyTrack_editionId_idx" ON "WeeklyTrack"("editionId");

-- AddForeignKey
ALTER TABLE "WeeklyTrack" ADD CONSTRAINT "WeeklyTrack_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyTrack" ADD CONSTRAINT "WeeklyTrack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
