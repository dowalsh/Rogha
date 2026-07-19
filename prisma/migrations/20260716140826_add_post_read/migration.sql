-- CreateTable
CREATE TABLE "PostRead" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostRead_pkey" PRIMARY KEY ("postId","userId")
);

-- CreateIndex
CREATE INDEX "PostRead_postId_idx" ON "PostRead"("postId");

-- CreateIndex
CREATE INDEX "PostRead_userId_readAt_idx" ON "PostRead"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "PostRead" ADD CONSTRAINT "PostRead_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostRead" ADD CONSTRAINT "PostRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
