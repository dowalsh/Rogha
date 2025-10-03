/*
  Warnings:

  - The values [FOLLOW] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
DELETE FROM "Notification" WHERE type = 'FOLLOW';
CREATE TYPE "public"."NotificationType_new" AS ENUM ('LIKE', 'COMMENT', 'SUBMIT');
ALTER TABLE "public"."Notification" ALTER COLUMN "type" TYPE "public"."NotificationType_new" USING ("type"::text::"public"."NotificationType_new");
ALTER TYPE "public"."NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "public"."NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;
