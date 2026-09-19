-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardingChecklistCollapsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingIntroSeenAt" TIMESTAMP(3);
