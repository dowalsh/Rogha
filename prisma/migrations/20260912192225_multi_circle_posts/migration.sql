-- Multi-circle sharing: additive migration. Adds the PostCircle join table
-- and backfills it from the existing single-circle Post.circleId column,
-- which is left untouched (deprecated, no longer written by new code).

CREATE TABLE "PostCircle" (
  "postId" TEXT NOT NULL,
  "circleId" TEXT NOT NULL,
  CONSTRAINT "PostCircle_pkey" PRIMARY KEY ("postId","circleId")
);

CREATE INDEX "PostCircle_circleId_idx" ON "PostCircle"("circleId");

ALTER TABLE "PostCircle" ADD CONSTRAINT "PostCircle_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostCircle" ADD CONSTRAINT "PostCircle_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every existing single-circle post becomes a 1-row PostCircle set.
INSERT INTO "PostCircle" ("postId", "circleId")
SELECT "id", "circleId" FROM "Post" WHERE "circleId" IS NOT NULL;
