"use server";

import { prisma } from "@/lib/prisma";
import {
  auth,
  currentUser,
  type User as ClerkUser,
} from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

/**
 * Upsert Clerk user into DB
 * Works with both Clerk webhooks (pass ClerkUser) and
 * lazy sync (fallback to auth/currentUser).
 */
export async function upsertClerkUser(clerkUser: ClerkUser | null = null) {
  try {
    // Prefer passed user (webhook), fallback to auth flow
    let user = clerkUser;
    let userId: string | null = user?.id ?? null;

    if (!user) {
      const { userId: authId } = await auth();
      if (!authId) return null;
      userId = authId;
      user = await currentUser();
      if (!user) return null;
    }

    return await prisma.user.upsert({
      where: { clerkId: userId! },
      update: {
        name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
        image: user.imageUrl,
        email: user.primaryEmailAddress?.emailAddress ?? "",
      },
      create: {
        clerkId: userId!,
        name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
        username:
          user.username ??
          user.primaryEmailAddress?.emailAddress?.split("@")[0] ??
          `user_${userId}`,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        image: user.imageUrl,
      },
    });
  } catch (error) {
    console.error("Error upserting Clerk user:", error);
    throw error;
  }
}

/**
 * Get user from DB by Clerk ID
 */
export async function getUserByClerkId(clerkId: string) {
  return prisma.user.findUnique({
    where: { clerkId },
    include: {
      _count: {
        select: {
          followers: true,
          following: true,
          posts: true,
        },
      },
    },
  });
}

/**
 * Get current DB user id from Clerk auth
 */
export async function getDbUserId() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const user = await getUserByClerkId(clerkId);
  if (!user) throw new Error("User not found");

  return user.id;
}

/**
 * Suggest 3 random users excluding self & already-followed
 */
export async function getRandomUsers() {
  try {
    const userId = await getDbUserId();
    if (!userId) return [];

    const randomUsers = await prisma.user.findMany({
      where: {
        AND: [
          { NOT: { id: userId } },
          { NOT: { followers: { some: { followerId: userId } } } },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        _count: {
          select: { followers: true },
        },
      },
      take: 3,
    });

    return randomUsers;
  } catch (error) {
    console.error("Error fetching random users:", error);
    return [];
  }
}

/**
 * Toggle follow/unfollow another user
 */
export async function toggleFollow(targetUserId: string) {
  try {
    const userId = await getDbUserId();
    if (!userId) return;
    if (userId === targetUserId) throw new Error("You cannot follow yourself");

    const existingFollow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      // Unfollow
      await prisma.follows.delete({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId,
          },
        },
      });
      return { following: false };
    } else {
      // Follow
      await prisma.$transaction([
        prisma.follows.create({
          data: { followerId: userId, followingId: targetUserId },
        }),
        prisma.notification.create({
          data: {
            type: "FOLLOW",
            userId: targetUserId,
            creatorId: userId,
          },
        }),
      ]);
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error in toggleFollow:", error);
    return { success: false };
  }
}
