// src/lib/access/postAccess.ts

import { prisma } from "@/lib/prisma";
import { getAcceptedFriendships } from "@/lib/friends";

export type AudienceType = "ALL_USERS" | "FRIENDS" | "CIRCLE";

export type MinimalPost = {
  id: string;
  authorId: string;
  status: string; // "DRAFT" | "SUBMITTED" | "PUBLISHED" | ...
  audienceType: AudienceType;
  circleId: string | null;
  createdAt: Date;
};

//
// --------------------------------------------------
// 1️⃣ PURE POLICY (no DB, fully testable)
// --------------------------------------------------
//

function canViewPostPolicy(args: {
  viewerId: string | null;
  post: MinimalPost;
  friendshipAcceptedAt: Date | null; // null = not a friend
  isInCircle: boolean;
}) {
  const { viewerId, post, friendshipAcceptedAt, isInCircle } = args;

  // Unpublished → author only
  if (post.status !== "PUBLISHED") {
    return viewerId === post.authorId;
  }

  // Author can always see own post
  if (viewerId === post.authorId) return true;

  switch (post.audienceType) {
    case "ALL_USERS":
      return true;

    case "FRIENDS":
      // Must be a friend AND friendship must predate the post
      return (
        !!viewerId &&
        friendshipAcceptedAt !== null &&
        friendshipAcceptedAt <= post.createdAt
      );

    case "CIRCLE":
      return !!viewerId && isInCircle;

    default:
      return false;
  }
}

//
// --------------------------------------------------
// 2️⃣ BATCH RESOLVER (THE AUTHORITY)
// --------------------------------------------------
//

export async function resolveVisiblePosts(args: {
  viewerId: string | null;
  posts: MinimalPost[];
}) {
  const { viewerId, posts } = args;

  if (!posts.length) return [];

  // Anonymous viewer fast path
  if (!viewerId) {
    return posts.filter((post) =>
      canViewPostPolicy({
        viewerId: null,
        post,
        friendshipAcceptedAt: null,
        isInCircle: false,
      }),
    );
  }

  // Fetch friendships (with dates) once
  const friendships = await getAcceptedFriendships(viewerId);
  const friendMap = new Map(friendships.map((f) => [f.friendId, f.acceptedAt]));

  // Collect circleIds in this batch
  const circleIds = Array.from(
    new Set(posts.map((p) => p.circleId).filter((id): id is string => !!id)),
  );

  // Fetch memberships once
  const joinedCircleIds =
    circleIds.length > 0
      ? await prisma.circleMember
          .findMany({
            where: {
              userId: viewerId,
              status: "JOINED",
              circleId: { in: circleIds },
            },
            select: { circleId: true },
          })
          .then((rows) => rows.map((r) => r.circleId))
      : [];

  const joinedSet = new Set(joinedCircleIds);

  return posts.filter((post) =>
    canViewPostPolicy({
      viewerId,
      post,
      friendshipAcceptedAt: friendMap.get(post.authorId) ?? null,
      isInCircle: post.circleId ? joinedSet.has(post.circleId) : false,
    }),
  );
}

//
// --------------------------------------------------
// 3️⃣ SINGLE POST WRAPPER
// --------------------------------------------------
//

export async function canViewPost(viewerId: string | null, post: MinimalPost) {
  const visible = await resolveVisiblePosts({
    viewerId,
    posts: [post],
  });

  return visible.length > 0;
}

export async function requirePostAccess(
  viewerId: string | null,
  postId: string,
) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      status: true,
      audienceType: true,
      circleId: true,
      createdAt: true,
    },
  });

  if (!post) {
    return null;
  }

  const allowed = await canViewPost(viewerId, post);

  if (!allowed) {
    return null;
  }

  return post;
}
