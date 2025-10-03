"use server";

import { prisma } from "@/lib/prisma";
import {
  auth,
  currentUser,
  type User as ClerkUser,
} from "@clerk/nextjs/server";
import type { UserResource } from "@clerk/types";
import { revalidatePath } from "next/cache";

/**
 * A normalized, Clerk-like user shape.
 * Works for both Clerk webhooks and lazy sync.
 */
type ClerkLike = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  imageUrl?: string | null;
  primaryEmailAddress?: { emailAddress: string | null } | null;
};

/**
 * Upsert Clerk user into DB.
 * Accepts either a Clerk webhook payload, a UserResource, or nothing (falls back to auth()).
 */
export async function upsertClerkUser(clerkUser?: ClerkLike | null) {
  try {
    let user = clerkUser;
    let userId: string | null = user?.id ?? null;

    // If no user passed in, fall back to auth() + currentUser()
    if (!user) {
      const { userId: authId } = await auth();
      if (!authId) return null;

      userId = authId;
      user = await currentUser();
      if (!user) return null;
    }

    // Normalize fields for DB
    const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    const email = user.primaryEmailAddress?.emailAddress ?? "";
    const username = user.username ?? email.split("@")[0] ?? `user_${userId}`;

    return await prisma.user.upsert({
      where: { clerkId: userId! },
      update: {
        name,
        image: user.imageUrl ?? null,
        email,
      },
      create: {
        clerkId: userId!,
        name,
        username,
        email,
        image: user.imageUrl ?? null,
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
