-- Corrects 20260719061530_backfill_post_reads_as_read: that migration backdated readAt to
-- the post's publish time, but src/lib/home.ts treats a post as "new" whenever
-- latestActivityAt (from ActivityEvent — comments/likes) is newer than readAt, not just
-- when readAt is missing. Since almost all comment/like activity happens after publish,
-- backdating left everything still reading as new.
--
-- Bumps readAt to NOW() only for rows that still hold the exact backfilled timestamp
-- (COALESCE(edition.publishedAt, post.createdAt)) — this is what marks pre-existing
-- activity as caught up. Genuine user reads (readAt stamped via markPostRead's default
-- now()) will not coincidentally match that value to the millisecond, so they're left
-- untouched: a post with real new activity since a user's actual last read still shows
-- as new for that user, which is correct.
UPDATE "PostRead" pr
SET "readAt" = NOW()
FROM "Post" p
LEFT JOIN "Edition" e ON e.id = p."editionId"
WHERE pr."postId" = p.id
  AND pr."readAt" = COALESCE(e."publishedAt", p."createdAt");
