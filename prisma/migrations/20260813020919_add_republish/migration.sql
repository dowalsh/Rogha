-- AlterEnum
ALTER TYPE "AudienceType" ADD VALUE 'RECIPIENTS';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "republishedFromPostId" TEXT;

-- CreateTable
CREATE TABLE "PostRecipient" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostRecipient_pkey" PRIMARY KEY ("postId","userId")
);

-- CreateIndex
CREATE INDEX "PostRecipient_userId_idx" ON "PostRecipient"("userId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_republishedFromPostId_fkey" FOREIGN KEY ("republishedFromPostId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostRecipient" ADD CONSTRAINT "PostRecipient_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostRecipient" ADD CONSTRAINT "PostRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
