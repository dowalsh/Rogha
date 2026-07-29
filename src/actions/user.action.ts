"use server";

import { prisma } from "@/lib/prisma";
import {
  auth,
  currentUser,
  type User as ClerkUser,
} from "@clerk/nextjs/server";
import type { UserResource } from "@clerk/types";
import { revalidatePath } from "next/cache";
import { sanitizeUsername, dedupeUsername } from "@/lib/username";

/**
 * A normalized, Clerk-like user shape.
 * Works for both Clerk webhooks and lazy sync.
 */
type ClerkLike = {
  id: string;
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

    // Normalize fields for DB — username is the only display identity;
    // Clerk's firstName/lastName are never read or stored.
    const email = user.primaryEmailAddress?.emailAddress || "";
    const rawUsername =
      user.username ||
      (email ? email.split("@")[0] : "") ||
      (userId ? `user_${userId.slice(-6)}` : "user");

    if (!email) throw new Error("Cannot upsert user without an email address");

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      return await prisma.user.update({
        where: { email },
        data: {
          clerkId: userId!,
          // Once a user has any image (Clerk-synced or self-uploaded avatar,
          // see avatar upload flow), stop overwriting it from Clerk on
          // every sync — only ever set it while still unset.
          ...(existing.image ? {} : { image: user.imageUrl ?? null }),
        },
      });
    }

    const sanitizedBase = sanitizeUsername(rawUsername) || "user";
    const usernameLower = await dedupeUsername(sanitizedBase);
    const username =
      usernameLower === sanitizedBase.toLowerCase()
        ? sanitizedBase
        : usernameLower;

    return await prisma.user.create({
      data: {
        clerkId: userId!,
        username,
        usernameLower,
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

export async function checkIsAdmin(): Promise<boolean> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return false;
  const user = await getUserByClerkId(clerkId);
  return user?.role === "ADMIN";
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
