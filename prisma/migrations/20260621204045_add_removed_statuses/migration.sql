-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- AlterEnum
ALTER TYPE "PostStatus" ADD VALUE 'REMOVED';

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "status" "CommentStatus" NOT NULL DEFAULT 'ACTIVE';
