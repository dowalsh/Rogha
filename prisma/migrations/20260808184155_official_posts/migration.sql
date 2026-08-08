-- CreateEnum
CREATE TYPE "OfficialKind" AS ENUM ('EDITORS_NOTE', 'COMMUNITY_FEATURE');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "notifyAllUsers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "officialKind" "OfficialKind";
