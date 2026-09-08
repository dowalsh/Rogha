-- CreateTable
CREATE TABLE "WeeklyArtist" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "playCount" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "imageSource" TEXT,
    "spotifyArtistUrl" TEXT,
    "lastfmUrl" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyArtist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyArtist_editionId_idx" ON "WeeklyArtist"("editionId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyArtist_editionId_userId_key" ON "WeeklyArtist"("editionId", "userId");

-- AddForeignKey
ALTER TABLE "WeeklyArtist" ADD CONSTRAINT "WeeklyArtist_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyArtist" ADD CONSTRAINT "WeeklyArtist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
