-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CIRCLE_JOIN';

-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "pushCircleJoins" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "CircleInvite" (
    "id" TEXT NOT NULL,
    "circleId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "CircleInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CircleInvite_code_key" ON "CircleInvite"("code");

-- CreateIndex
CREATE INDEX "CircleInvite_circleId_idx" ON "CircleInvite"("circleId");

-- AddForeignKey
ALTER TABLE "CircleInvite" ADD CONSTRAINT "CircleInvite_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "Circle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CircleInvite" ADD CONSTRAINT "CircleInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
