-- Add usernameLower (case-insensitive uniqueness key), backfill existing
-- rows in-place, then lock it down. All in one migration so
-- `prisma migrate deploy` (run automatically on every deploy, see
-- package.json build script) can apply it unattended in one pass.

ALTER TABLE "User" ADD COLUMN "usernameLower" TEXT;

-- Sanitize existing usernames to the allowed charset (letters/numbers/underscore).
-- Rows that end up empty (e.g. a username that was all punctuation) fall back
-- to a "user_<id-suffix>" placeholder — same shape upsertClerkUser() uses.
UPDATE "User"
SET "usernameLower" = lower(
  CASE WHEN regexp_replace(username, '[^a-zA-Z0-9_]', '', 'g') = ''
       THEN 'user_' || substr(id, length(id) - 5, 6)
       ELSE regexp_replace(username, '[^a-zA-Z0-9_]', '', 'g')
  END
)
WHERE "usernameLower" IS NULL;

-- Dedupe collisions introduced by sanitizing (e.g. two users who both
-- sanitize down to "john") by appending a numeric suffix per the spec
-- ("john", "john2", "john3", ...), ordered by account age so the oldest
-- account keeps the bare handle.
WITH ranked AS (
  SELECT id, "usernameLower",
         ROW_NUMBER() OVER (PARTITION BY "usernameLower" ORDER BY "createdAt", id) AS rn
  FROM "User"
)
UPDATE "User" u
SET "usernameLower" = u."usernameLower" || r.rn::text
FROM ranked r
WHERE u.id = r.id AND r.rn > 1;

-- Keep the display username in sync with the sanitized/deduped form for any
-- row that changed (invalid chars stripped, or a dedup suffix applied) —
-- the spec preserves user-typed casing, but there's no casing to preserve
-- for auto-derived handles that needed sanitizing in the first place.
UPDATE "User"
SET username = "usernameLower"
WHERE username !~ '^[a-zA-Z0-9_]+$' OR username = '' OR lower(username) != "usernameLower";

ALTER TABLE "User" ALTER COLUMN "usernameLower" SET NOT NULL;
CREATE UNIQUE INDEX "User_usernameLower_key" ON "User"("usernameLower");

-- New notification/report target types used by the profiles & friends work.
ALTER TYPE "NotificationType" ADD VALUE 'FRIEND_REQUEST_ACCEPTED';
ALTER TYPE "ContentType" ADD VALUE 'USER';
