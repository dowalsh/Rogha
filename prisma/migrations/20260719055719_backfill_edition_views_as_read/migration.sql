-- Data backfill: EditionView shipped with no seed data, so every previously-published
-- edition reads as "unread" for every user (no row = not opened, per getPublishedEditionById's
-- hasOpened check in src/lib/editions.ts). This treats all editions that existed at deploy time
-- as already-read for all current users, so only genuinely new editions start unread.
--
-- Backdates openedAt to the edition's publishedAt so it doesn't read as "just opened now".
-- ON CONFLICT DO NOTHING makes this safe to re-run and a no-op for any (edition, user) pair
-- that already has a real view recorded.
INSERT INTO "EditionView" ("editionId", "userId", "openedAt")
SELECT e.id, u.id, e."publishedAt"
FROM "Edition" e
CROSS JOIN "User" u
WHERE e."publishedAt" IS NOT NULL
ON CONFLICT ("editionId", "userId") DO NOTHING;
