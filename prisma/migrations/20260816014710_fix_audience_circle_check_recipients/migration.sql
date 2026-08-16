-- The RECIPIENTS audience type (republish) was added to the AudienceType
-- enum via Prisma, but this CHECK constraint is raw SQL from
-- 20251108064839_add_roles_and_audience that Prisma's schema can't express
-- and therefore never updated — it still only allowed circleId IS NULL for
-- FRIENDS/ALL_USERS, rejecting every RECIPIENTS insert.
ALTER TABLE "Post" DROP CONSTRAINT "post_audience_circle_ck";

ALTER TABLE "Post"
ADD CONSTRAINT "post_audience_circle_ck"
CHECK (
  ("audienceType" = 'CIRCLE' AND "circleId" IS NOT NULL)
  OR ("audienceType" IN ('FRIENDS','ALL_USERS','RECIPIENTS') AND "circleId" IS NULL)
);
