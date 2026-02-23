// src/lib/access/postAccess.ts

import { prisma } from "@/lib/prisma";
import { getAcceptedFriendIds } from "@/lib/friends";

export type PostAudienceType = "ALL_USERS" | "FRIENDS" | "CIRCLE";

export type PostAccessInput = {
  viewerId: string | null;
  post: {
    id?: string;
    authorId: string;
    status: string; // "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED"
    audienceType: PostAudienceType | null;
    circleId: string | null;
  };
};

//
// --------------------------------------------------
// 1) PURE POLICY (no DB)
// --------------------------------------------------
//

export function canViewPostPolicy(args: {
  viewerId: string | null;
  post: PostAccessInput["post"];
  isFriendOfAuthor: boolean;
  isInCircle: boolean;
}) {
  const { viewerId, post, isFriendOfAuthor, isInCircle } = args;

  // Unpublished → only author
  if (post.status !== "PUBLISHED") {
    return !!viewerId && viewerId === post.authorId;
  }

  // Author always allowed
  if (viewerId && viewerId === post.authorId) return true;

  const audience = post.audienceType ?? "ALL_USERS";

  if (audience === "ALL_USERS") return true;

  if (!viewerId) return false;

  if (audience === "FRIENDS") return isFriendOfAuthor;

  if (audience === "CIRCLE") return !!post.circleId && isInCircle;

  return false;
}

//
// --------------------------------------------------
// 2) SINGLE POST RESOLVER (DB-backed)
// --------------------------------------------------
//

export async function canViewPost(args: PostAccessInput) {
  const { viewerId, post } = args;

  // Fast public paths
  if (post.status !== "PUBLISHED") {
    return !!viewerId && viewerId === post.authorId;
  }

  if (post.audienceType == null || post.audienceType === "ALL_USERS") {
    return true;
  }

  if (!viewerId) return false;

  if (viewerId === post.authorId) return true;

  let isFriendOfAuthor = false;
  let isInCircle = false;

  if (post.audienceType === "FRIENDS") {
    const friendIds = await getAcceptedFriendIds(viewerId);
    isFriendOfAuthor = friendIds.includes(post.authorId);
  }

  if (post.audienceType === "CIRCLE") {
    if (!post.circleId) return false;

    const membershipCount = await prisma.circleMember.count({
      where: {
        circleId: post.circleId,
        userId: viewerId,
        status: "JOINED",
      },
    });

    isInCircle = membershipCount > 0;
  }

  return canViewPostPolicy({
    viewerId,
    post,
    isFriendOfAuthor,
    isInCircle,
  });
}

//
// --------------------------------------------------
// 3) BATCH RESOLVER (FOR BUZZ / FEEDS)
// --------------------------------------------------
//

export async function filterVisiblePostsForViewer(args: {
  viewerId: string;
  posts: Array<{
    id: string;
    authorId: string;
    status: string;
    audienceType: PostAudienceType | null;
    circleId: string | null;
  }>;
}) {
  const { viewerId, posts } = args;

  if (!posts.length) return [];

  // 1) Fetch friendships once
  const friendIds = await getAcceptedFriendIds(viewerId);

  // 2) Collect circle IDs present in this batch
  const circleIds = Array.from(
    new Set(posts.map((p) => p.circleId).filter((id): id is string => !!id)),
  );

  // 3) Fetch circle memberships once
  const myCircleIds =
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

  // 4) Apply policy
  return posts.filter((post) =>
    canViewPostPolicy({
      viewerId,
      post,
      isFriendOfAuthor: friendIds.includes(post.authorId),
      isInCircle: post.circleId ? myCircleIds.includes(post.circleId) : false,
    }),
  );
}
