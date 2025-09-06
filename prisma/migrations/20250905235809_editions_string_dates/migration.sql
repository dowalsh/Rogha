/*
  Warnings:

  - A unique constraint covering the columns `[weekStart]` on the table `Edition` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `weekStart` to the `Edition` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Edition" ADD COLUMN     "weekStart" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Edition_publishedAt_idx" ON "public"."Edition"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Edition_weekStart_key" ON "public"."Edition"("weekStart");
