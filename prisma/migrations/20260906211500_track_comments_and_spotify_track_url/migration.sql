-- WeeklyTrack: switch from composite PK to a scalar id (so Comment can hold
-- a single FK to it), add spotifyTrackUrl (exact Spotify track match, when
-- found), keep (editionId, userId) uniqueness via a unique index instead.
-- Backfill the new id column while the old PK is still in place — dropping
-- the PK before this UPDATE leaves the table with no replica identity,
-- which Postgres rejects on any UPDATE while a publication is watching it.
ALTER TABLE "WeeklyTrack" ADD COLUMN "id" TEXT;
UPDATE "WeeklyTrack" SET "id" = md5(random()::text || clock_timestamp()::text) WHERE "id" IS NULL;
ALTER TABLE "WeeklyTrack" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "WeeklyTrack" DROP CONSTRAINT "WeeklyTrack_pkey";
ALTER TABLE "WeeklyTrack" ADD CONSTRAINT "WeeklyTrack_pkey" PRIMARY KEY ("id");
ALTER TABLE "WeeklyTrack" ADD COLUMN "spotifyTrackUrl" TEXT;
CREATE UNIQUE INDEX "WeeklyTrack_editionId_userId_key" ON "WeeklyTrack"("editionId", "userId");

-- Comment: postId becomes optional, weeklyTrackId added — a comment
-- attaches to exactly one of a Post or a WeeklyTrack (enforced in the API).
ALTER TABLE "Comment" ALTER COLUMN "postId" DROP NOT NULL;
ALTER TABLE "Comment" ADD COLUMN "weeklyTrackId" TEXT;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_weeklyTrackId_fkey" FOREIGN KEY ("weeklyTrackId") REFERENCES "WeeklyTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Comment_authorId_weeklyTrackId_idx" ON "Comment"("authorId", "weeklyTrackId");
