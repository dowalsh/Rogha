// lib/auth.ts
import { prisma } from "@/lib/prisma";
import {
  auth,
  currentUser,
  type User as ClerkUser,
} from "@clerk/nextjs/server";

export async function upsertClerkUser(clerkUser?: ClerkUser | null) {
  try {
    // Use provided Clerk user (webhook) or fetch from auth (dev/local flow)
    let user = clerkUser;
    let userId: string | null = clerkUser?.id ?? null;

    if (!user) {
      const authData = await auth();
      userId = authData.userId;
      if (!userId) return null;
      user = await currentUser();
    }
    if (!user) return null;

    if (!userId || !user) return null;

    return await prisma.user.upsert({
      where: { clerkId: userId },
      update: {
        // you can refresh fields here if Clerk user changes
        name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
        image: user.imageUrl,
        email: user.primaryEmailAddress?.emailAddress ?? "",
      },
      create: {
        clerkId: userId,
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
