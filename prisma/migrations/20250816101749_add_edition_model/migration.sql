-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "editionId" TEXT,
ADD COLUMN     "isSubmitted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Edition" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Edition_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
