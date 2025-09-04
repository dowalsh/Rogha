-- DropForeignKey
ALTER TABLE "public"."Post" DROP CONSTRAINT "Post_editionId_fkey";

-- AlterTable
ALTER TABLE "public"."Edition" ALTER COLUMN "publishedAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Post" ALTER COLUMN "content" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Post" ADD CONSTRAINT "Post_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "public"."Edition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
