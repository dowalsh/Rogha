-- AlterTable
ALTER TABLE "PostRead" ALTER COLUMN "firstReadAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "WeeklyTrack" ADD COLUMN     "spotifyUri" TEXT;

-- CreateTable
CREATE TABLE "WeeklyPlaylist" (
    "editionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spotifyPlaylistId" TEXT NOT NULL,
    "spotifyPlaylistUrl" TEXT NOT NULL,
    "trackCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyPlaylist_pkey" PRIMARY KEY ("editionId","userId")
);

-- CreateIndex
CREATE INDEX "WeeklyPlaylist_editionId_idx" ON "WeeklyPlaylist"("editionId");

-- AddForeignKey
ALTER TABLE "WeeklyPlaylist" ADD CONSTRAINT "WeeklyPlaylist_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPlaylist" ADD CONSTRAINT "WeeklyPlaylist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
