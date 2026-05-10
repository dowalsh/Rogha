/*
  Warnings:

  - A unique constraint covering the columns `[publicShareToken]` on the table `Post` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "publicShareCreatedAt" TIMESTAMP(3),
ADD COLUMN     "publicShareEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicShareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Post_publicShareToken_key" ON "Post"("publicShareToken");
