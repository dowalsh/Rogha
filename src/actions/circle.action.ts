// src/actions/circle.action.ts
//
"use server";

import { prisma } from "@/lib/prisma";
import { getDbUserId } from "./user.action";
import { revalidatePath } from "next/cache";
import { defaultInviteBase, generateUniqueInviteCode } from "@/lib/inviteCode";
import { createCircleJoinNotifications } from "./notification.action";

// --- Types ---
interface CreateCircleInput {
  name: string;
  description?: string;
}

interface AddMemberInput {
  circleId: string;
  userEmail: string;
}

export async function createCircle({ name, description }: CreateCircleInput) {
  try {
    const userId = await getDbUserId();
    if (!userId) throw new Error("Not authenticated");

    const circle = await prisma.circle.create({
      data: {
        name,
        description,
        members: {
          create: {
            userId,
            status: "JOINED",
          },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, email: true } } },
        },
      },
    });
    revalidatePath("/friends");
    return circle;
  } catch (error) {
    console.error("[CREATE_CIRCLE_ERROR]", error);
    throw new Error("Failed to create circle");
  }
}

export async function getCirclesForUser() {
  try {
    const userId = await getDbUserId();
    if (!userId) return [];

    // Start from the user and traverse their memberships
    const memberships = await prisma.circleMember.findMany({
      where: { userId, status: "JOINED" },
      include: {
        circle: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
              },
            },
            posts: {
              where: { status: "PUBLISHED" },
              select: {
                id: true,
                title: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    // Map to circles directly
    const circles = memberships.map((m) => m.circle);

    return circles;
  } catch (error) {
    console.error("[GET_CIRCLES_ERROR]", error);
    throw new Error("Failed to fetch circles");
  }
}

// Lightweight payload for the composer's share screen (multi-circle sharing
// spec) — just what the circle cards + face rows + member popup need, unlike
// getCirclesForUser() which also loads each circle's published-post history
// for its other callers (CirclesCarousel, CircleDialog).
export async function getCirclesForSharePicker() {
  const userId = await getDbUserId();
  if (!userId) return [];

  const memberships = await prisma.circleMember.findMany({
    where: { userId, status: "JOINED" },
    include: {
      circle: {
        include: {
          members: {
            where: { status: "JOINED" },
            orderBy: { joinedAt: "asc" },
            include: {
              user: { select: { id: true, username: true, image: true } },
            },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return memberships.map(({ circle }) => ({
    id: circle.id,
    name: circle.name,
    memberCount: circle.members.length,
    members: circle.members.map((m) => m.user),
  }));
}

export async function addMemberToCircle({
  circleId,
  friendId,
}: {
  circleId: string;
  friendId: string;
}) {
  try {
    const currentUserId = await getDbUserId();
    if (!currentUserId) throw new Error("Not authenticated");

    // Verify current user is part of the circle
    const isMember = await prisma.circleMember.findFirst({
      where: { circleId, userId: currentUserId, status: "JOINED" },
    });
    if (!isMember) throw new Error("You are not a member of this circle");

    // Verify they are friends
    const isFriend = await prisma.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { aId: currentUserId, bId: friendId },
          { aId: friendId, bId: currentUserId },
        ],
      },
    });
    if (!isFriend) throw new Error("You can only add friends to circles");

    // Add or rejoin member
    await prisma.circleMember.upsert({
      where: {
        circleId_userId: {
          circleId,
          userId: friendId,
        },
      },
      update: { status: "JOINED", joinedAt: new Date() },
      create: {
        circleId,
        userId: friendId,
        status: "JOINED",
      },
    });

    // No revalidatePath here — the caller updates its member list
    // optimistically, and revalidating this route triggers a Next.js
    // router refresh that resets the circle dialog's open/selected state.
    return { success: true };
  } catch (error) {
    console.error("[ADD_MEMBER_ERROR]", error);
    throw new Error("Failed to add member to circle");
  }
}

// ✅ Remove a member from the circle
export async function removeMemberFromCircle(
  circleId: string,
  memberId: string
) {
  try {
    const currentUserId = await getDbUserId();
    if (!currentUserId) throw new Error("Not authenticated");

    const isMember = await prisma.circleMember.findFirst({
      where: { circleId, userId: currentUserId, status: "JOINED" },
    });
    if (!isMember) throw new Error("You are not a member of this circle");

    // Soft-remove (not delete): a REMOVED row is what lets joinCircleByCode
    // block that person from rejoining via a still-live invite link.
    await prisma.circleMember.updateMany({
      where: { circleId, userId: memberId },
      data: { status: "REMOVED" },
    });

    // No revalidatePath here — same reasoning as addMemberToCircle above.
    return { success: true };
  } catch (error) {
    console.error("[REMOVE_MEMBER_ERROR]", error);
    throw new Error("Failed to remove member from circle");
  }
}

export async function leaveCircle(circleId: string) {
  const userId = await getDbUserId();
  if (!userId) throw new Error("Not authenticated");

  await prisma.circleMember.updateMany({
    where: { circleId, userId },
    data: { status: "LEFT" },
  });

  revalidatePath("/friends");
  return { success: true };
}

// ✅ Get a single Circle (with posts + members)
export async function getCircleById(circleId: string) {
  try {
    const userId = await getDbUserId();
    if (!userId) throw new Error("Not authenticated");

    const circle = await prisma.circle.findFirst({
      where: {
        id: circleId,
        members: { some: { userId, status: "JOINED" } },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true },
            },
          },
        },
        posts: {
          where: { status: "PUBLISHED" },
          include: {
            author: {
              select: { id: true, username: true },
            },
          },
        },
      },
    });

    if (!circle) throw new Error("Circle not found or you are not a member");
    return circle;
  } catch (error) {
    console.error("[GET_CIRCLE_ERROR]", error);
    throw new Error("Failed to fetch circle");
  }
}

// --- Invite by link (docs/specs/2026-09-19-invite-by-link.md) ---

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function inviteStatus(invite: { expiresAt: Date; revokedAt: Date | null }) {
  if (invite.revokedAt) return "revoked" as const;
  if (invite.expiresAt.getTime() <= Date.now()) return "expired" as const;
  return "active" as const;
}

export async function getActiveCircleInvite(circleId: string) {
  const userId = await getDbUserId();
  if (!userId) throw new Error("Not authenticated");

  const isMember = await prisma.circleMember.findFirst({
    where: { circleId, userId, status: "JOINED" },
  });
  if (!isMember) throw new Error("You are not a member of this circle");

  const invite = await prisma.circleInvite.findFirst({
    where: { circleId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  return invite;
}

export async function createCircleInvite({
  circleId,
  customCode,
}: {
  circleId: string;
  customCode?: string;
}) {
  const userId = await getDbUserId();
  if (!userId) throw new Error("Not authenticated");

  const [isMember, circle] = await Promise.all([
    prisma.circleMember.findFirst({
      where: { circleId, userId, status: "JOINED" },
    }),
    prisma.circle.findUnique({ where: { id: circleId }, select: { name: true } }),
  ]);
  if (!isMember) throw new Error("You are not a member of this circle");
  if (!circle) throw new Error("Circle not found");

  const code = await generateUniqueInviteCode(customCode || defaultInviteBase(circle.name));

  // Creating a new invite always retires any currently-active one for this
  // circle — re-sharing offers "copy existing" for that, this path is "create new".
  const [invite] = await prisma.$transaction([
    prisma.circleInvite.create({
      data: {
        circleId,
        code,
        createdById: userId,
        expiresAt: new Date(Date.now() + INVITE_LIFETIME_MS),
      },
    }),
    prisma.circleInvite.updateMany({
      where: { circleId, revokedAt: null, code: { not: code } },
      data: { revokedAt: new Date() },
    }),
  ]);

  return invite;
}

// Public — no auth. Backs the /join/[code] landing page.
export async function getCircleInviteInfo(code: string) {
  const invite = await prisma.circleInvite.findUnique({
    where: { code },
    include: {
      circle: {
        select: {
          id: true,
          name: true,
          members: { where: { status: "JOINED" }, select: { userId: true } },
        },
      },
      createdBy: { select: { username: true } },
    },
  });

  if (!invite) return { status: "not_found" as const };

  return {
    status: inviteStatus(invite),
    circleId: invite.circle.id,
    circleName: invite.circle.name,
    inviterUsername: invite.createdBy.username,
    memberCount: invite.circle.members.length,
  };
}

export async function joinCircleByCode(code: string) {
  const userId = await getDbUserId();
  if (!userId) throw new Error("Not authenticated");

  const invite = await prisma.circleInvite.findUnique({ where: { code } });
  if (!invite) return { error: "not_found" as const };

  const status = inviteStatus(invite);
  if (status !== "active") return { error: status };

  const existingMembership = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId: invite.circleId, userId } },
  });

  if (existingMembership?.status === "REMOVED") {
    return { error: "removed" as const };
  }
  if (existingMembership?.status === "JOINED") {
    return { alreadyMember: true as const, circleId: invite.circleId };
  }

  await prisma.circleMember.upsert({
    where: { circleId_userId: { circleId: invite.circleId, userId } },
    update: { status: "JOINED", joinedAt: new Date() },
    create: { circleId: invite.circleId, userId, status: "JOINED" },
  });

  await createCircleJoinNotifications({ circleId: invite.circleId, joinedUserId: userId });

  return { joined: true as const, circleId: invite.circleId };
}
