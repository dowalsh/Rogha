"use server";

import { prisma } from "@/lib/prisma";
import { getDbUserId } from "./user.action";
import { revalidatePath } from "next/cache";

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
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    revalidatePath("/circles");
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
                    name: true,
                    username: true,
                    email: true,
                  },
                },
              },
            },
            posts: {
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
      where: { circleId, userId: currentUserId },
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
      update: { status: "JOINED" },
      create: {
        circleId,
        userId: friendId,
        status: "JOINED",
      },
    });

    revalidatePath("/circles");
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
      where: { circleId, userId: currentUserId },
    });
    if (!isMember) throw new Error("You are not a member of this circle");

    await prisma.circleMember.deleteMany({
      where: { circleId, userId: memberId },
    });

    revalidatePath("/circles");
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

  revalidatePath("/circles");
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
        members: { some: { userId } },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, username: true, email: true },
            },
          },
        },
        posts: {
          include: {
            author: {
              select: { id: true, name: true, username: true },
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
