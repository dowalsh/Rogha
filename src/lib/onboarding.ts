// src/lib/onboarding.ts
// First-run onboarding state — docs/specs/2026-09-19-first-run-onboarding.md.
// Everything here is derived from existing tables except the two small
// per-user flags (onboardingIntroSeenAt/onboardingChecklistCollapsed) that
// only track "has this ceremony been shown/dismissed."

import { prisma } from "@/lib/prisma";

export type OnboardingState = {
  hasCircle: boolean;
  primaryCircleId: string | null;
  // "Has invited someone": their primary circle has more than just them.
  // True whether that second member arrived via the plain friend-add flow
  // or invite-by-link — both write the same JOINED CircleMember row.
  hasInvitedSomeone: boolean;
  hasPosted: boolean;
  introSeen: boolean;
  checklistCollapsed: boolean;
};

// Gated on having never submitted a post — once true, the whole onboarding
// layer retires (see spec's "Welcome layer gate" rule).
async function hasEverPosted(userId: string): Promise<boolean> {
  const post = await prisma.post.findFirst({
    where: { authorId: userId, status: { not: "DRAFT" } },
    select: { id: true },
  });
  return post != null;
}

export async function getOnboardingState(
  userId: string,
): Promise<OnboardingState | null> {
  const [posted, user, primaryMembership] = await Promise.all([
    hasEverPosted(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        onboardingIntroSeenAt: true,
        onboardingChecklistCollapsed: true,
      },
    }),
    prisma.circleMember.findFirst({
      where: { userId, status: "JOINED" },
      orderBy: { joinedAt: "asc" },
      select: {
        circleId: true,
        circle: {
          select: { _count: { select: { members: { where: { status: "JOINED" } } } } },
        },
      },
    }),
  ]);

  if (posted || !user) return null;

  return {
    hasCircle: primaryMembership != null,
    primaryCircleId: primaryMembership?.circleId ?? null,
    hasInvitedSomeone: (primaryMembership?.circle._count.members ?? 0) > 1,
    hasPosted: false,
    introSeen: user.onboardingIntroSeenAt != null,
    checklistCollapsed: user.onboardingChecklistCollapsed,
  };
}
