-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "public"."Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
