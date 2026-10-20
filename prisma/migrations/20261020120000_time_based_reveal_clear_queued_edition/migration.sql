-- Time-based reveal (src/lib/reveal.ts): a SUBMITTED post is now live as
-- soon as its edition's publishedAt passes, and editions are assigned at
-- submit time. Under the old cron model queued posts carried no editionId
-- (the cron attached them on publish), so any SUBMITTED row still pointing
-- at an edition is stale and would otherwise go live instantly. Release it;
-- the cron's legacy safety net attaches it to the next edition it publishes.
UPDATE "Post" SET "editionId" = NULL WHERE "status" = 'SUBMITTED' AND "editionId" IS NOT NULL;
