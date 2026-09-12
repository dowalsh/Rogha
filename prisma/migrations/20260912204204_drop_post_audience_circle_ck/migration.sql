-- Multi-circle sharing: Post.circleId is now deprecated (superseded by the
-- PostCircle join table added in 20260912192225_multi_circle_posts) and is
-- never written by the app anymore, including for CIRCLE-audience posts.
-- The old hand-written check constraint required CIRCLE posts to have a
-- non-null circleId, which now rejects every CIRCLE save. Drop it — the
-- column stays for old-row rollback safety, but nothing enforces or expects
-- a value in it going forward.
ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "post_audience_circle_ck";
