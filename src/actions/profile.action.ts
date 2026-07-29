"use server";

import { prisma } from "@/lib/prisma";
import {
  canonicalPair,
  derivePerspectiveState,
  getMutualFriendCount,
} from "@/lib/friends";
import { resolveVisiblePosts } from "@/lib/access/postAccess";

export async function getUserPosts(userId: string) {
  try {
    const posts = await prisma.post.findMany({
      where: {
        authorId: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return posts;
  } catch (error) {
    console.error("Error fetching user posts:", error);
    throw new Error("Failed to fetch user posts");
  }
}

export type ProfileForViewer =
  | { kind: "not_found" }
  | {
      kind: "self";
      user: { id: string; username: string; name: string | null; image: string | null };
      posts: Awaited<ReturnType<typeof getUserPosts>>;
    }
  | {
      kind: "friend";
      user: { id: string; username: string; name: string | null; image: string | null };
      posts: Awaited<ReturnType<typeof getUserPosts>>;
    }
  | {
      kind: "stranger";
      user: { id: string; username: string; name: string | null; image: string | null };
      mutualCount: number;
      relationship: "NONE" | "PENDING_OUTGOING" | "PENDING_INCOMING";
    };

/**
 * Single entry point for the profile page — resolves which of the three
 * (four, counting "blocked" as "not_found") views a viewer gets for a given
 * username, per docs/specs/2026-07-28-profiles-and-friends.md. No new
 * visibility logic for posts: friend posts are filtered through the same
 * resolveVisiblePosts() used everywhere else.
 */
export async function getProfileForViewer(
  username: string,
  viewerId: string | null
): Promise<ProfileForViewer> {
  const profileUser = await prisma.user.findUnique({
    where: { usernameLower: username.toLowerCase() },
    select: { id: true, username: true, name: true, image: true },
  });
  if (!profileUser) return { kind: "not_found" };

  if (viewerId) {
    const blocked = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: viewerId, blockedId: profileUser.id },
          { blockerId: profileUser.id, blockedId: viewerId },
        ],
      },
      select: { blockerId: true },
    });
    // Hides the profile from either side of a block — treat it as if the
    // profile doesn't exist rather than leaking that a block is in effect.
    if (blocked) return { kind: "not_found" };
  }

  if (viewerId === profileUser.id) {
    const posts = await getUserPosts(profileUser.id);
    return { kind: "self", user: profileUser, posts };
  }

  if (!viewerId) {
    return {
      kind: "stranger",
      user: profileUser,
      mutualCount: 0,
      relationship: "NONE",
    };
  }

  const row = await prisma.friendship.findUnique({
    where: { aId_bId: canonicalPair(viewerId, profileUser.id) },
    select: { aId: true, bId: true, status: true, requesterId: true },
  });
  const relationship = derivePerspectiveState(row, viewerId);

  if (relationship === "ACCEPTED") {
    const rawPosts = await getUserPosts(profileUser.id);
    const visible = await resolveVisiblePosts({ viewerId, posts: rawPosts });
    const visibleIds = new Set(visible.map((p) => p.id));
    return {
      kind: "friend",
      user: profileUser,
      posts: rawPosts.filter((p) => visibleIds.has(p.id)),
    };
  }

  const mutualCount = await getMutualFriendCount(viewerId, profileUser.id);
  return { kind: "stranger", user: profileUser, mutualCount, relationship };
}
