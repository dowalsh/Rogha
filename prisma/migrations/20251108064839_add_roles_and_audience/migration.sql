-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AudienceType" AS ENUM ('CIRCLE', 'FRIENDS', 'ALL_USERS');


ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "Role";
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "audienceType" "AudienceType";

UPDATE "User" SET "role" = 'USER' WHERE "role" IS NULL;
UPDATE "Post" SET "audienceType" = 'FRIENDS' WHERE "audienceType" IS NULL;

UPDATE "Post"
SET "circleId" = NULL
WHERE "audienceType" IN ('FRIENDS', 'ALL_USERS') AND "circleId" IS NOT NULL;

-- 3.1 Set defaults (pick the audienceType default you want)
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

-- Option A (recommended product default):
ALTER TABLE "Post" ALTER COLUMN "audienceType" SET DEFAULT 'CIRCLE';

-- 3.2 Make NOT NULL now that data is backfilled
ALTER TABLE "User" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "Post" ALTER COLUMN "audienceType" SET NOT NULL;

ALTER TABLE "Post"
ADD CONSTRAINT "post_audience_circle_ck"
CHECK (
  ("audienceType" = 'CIRCLE' AND "circleId" IS NOT NULL)
  OR ("audienceType" IN ('FRIENDS','ALL_USERS') AND "circleId" IS NULL)
);