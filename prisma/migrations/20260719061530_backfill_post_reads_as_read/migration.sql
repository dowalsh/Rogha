-- Data backfill: PostRead (20260716140826_add_post_read) shipped with no seed data, so
-- every existing post reads as "new" for every user on the home/buzz feed (src/lib/home.ts
-- keys hero/unread state off getReadMapForPosts — no row = unread). This is the actual
-- mechanism behind the home page's "new" badges; EditionView (backfilled separately in
-- 20260719055719_backfill_edition_views_as_read) only drives the /editions reveal overlay.
--
-- Treats every post that existed at deploy time as already-read for every user who could
-- see it, so only genuinely new posts show as "new" going forward. readAt is backdated to
-- the post's edition publishedAt (falling back to the post's own createdAt for posts never
-- assigned to an edition) so it doesn't read as "just opened now".
-- ON CONFLICT DO NOTHING makes this safe to re-run.
INSERT INTO "PostRead" ("postId", "userId", "readAt")
SELECT p.id, u.id, COALESCE(e."publishedAt", p."createdAt")
FROM "Post" p
CROSS JOIN "User" u
LEFT JOIN "Edition" e ON e.id = p."editionId"
WHERE p.status = 'PUBLISHED'
ON CONFLICT ("postId", "userId") DO NOTHING;
