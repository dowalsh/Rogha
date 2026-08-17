-- Splits PostRead.readAt into firstReadAt (immutable, set once at row
-- creation) and lastReadAt (renamed from readAt, still updated on every
-- reopen). See src/lib/insights/trackingStart.ts and src/lib/postReads.ts
-- for the analytics-drift bug this fixes and the product decision behind
-- it: a post counts as "read" once (the first open) for count/window
-- purposes; reopening still counts as activity for last-active purposes.
--
-- Backfill caveat: existing rows have no recoverable true first-read
-- timestamp — the only value on record is readAt, which is itself already
-- the *most recent* read. firstReadAt is backfilled to that value as the
-- best available approximation. This is a one-time accuracy gap for
-- pre-existing rows only; every row created after this migration gets an
-- accurate, permanently-fixed firstReadAt from markPostRead.

ALTER TABLE "PostRead" ADD COLUMN "firstReadAt" TIMESTAMP(3);
UPDATE "PostRead" SET "firstReadAt" = "readAt";
ALTER TABLE "PostRead" ALTER COLUMN "firstReadAt" SET NOT NULL;

ALTER TABLE "PostRead" RENAME COLUMN "readAt" TO "lastReadAt";
ALTER INDEX "PostRead_userId_readAt_idx" RENAME TO "PostRead_userId_lastReadAt_idx";
CREATE INDEX "PostRead_firstReadAt_idx" ON "PostRead"("firstReadAt");
