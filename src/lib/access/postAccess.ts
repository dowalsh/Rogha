// src/lib/access/postAccess.ts
//
// Single authority for "can viewer V see post P". Every post-reading code
// path (routes, actions, feed builders) should go through
// resolveVisiblePosts/canViewPost/requirePostAccess rather than
// re-deriving any subset of these rules — see
// docs/specs/2026-08-02-post-visibility-rules.md for the full spec.

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getAcceptedFriendships } from "@/lib/friends";

export type AudienceType = "ALL_USERS" | "FRIENDS" | "CIRCLE" | "RECIPIENTS";

/**
 * The audience-eligibility half of the visibility rules (self / ALL_USERS /
 * FRIENDS-with-friend / CIRCLE-with-member), expressed as a Prisma `OR`
 * clause for cheap DB-level candidate filtering. Callers still need to run
 * results through resolveVisiblePosts for the temporal/block/report checks
 * this clause can't express — it only narrows PUBLISHED-eligible candidates.
 * Single source of truth so a feed query can't forget an audience branch
 * (see docs/specs/2026-08-02-post-visibility-rules.md).
 */
export function buildAudienceCandidateWhere(
  userId: string,
  friendIds: string[],
  circleIds: string[],
  recipientPostIds: string[] = [],
): Prisma.PostWhereInput["OR"] {
  return [
    { authorId: userId },
    { audienceType: "ALL_USERS" },
    { AND: [{ audienceType: "FRIENDS" }, { authorId: { in: friendIds } }] },
    { AND: [{ audienceType: "CIRCLE" }, { circleId: { in: circleIds } }] },
    { AND: [{ audienceType: "RECIPIENTS" }, { id: { in: recipientPostIds } }] },
  ];
}

/**
 * postIds of RECIPIENTS-audience posts the given user is a named recipient
 * of — the visibility boundary for that audience type (see republish spec).
 */
export async function getRecipientPostIds(userId: string): Promise<string[]> {
  const rows = await prisma.postRecipient.findMany({
    where: { userId },
    select: { postId: true },
  });
  return rows.map((r) => r.postId);
}

export type MinimalPost = {
  id: string;
  authorId: string;
  status: string; // "DRAFT" | "SUBMITTED" | "PUBLISHED" | ...
  audienceType: AudienceType;
  circleId: string | null;
  createdAt: Date;
  publishedAt: Date | null; // the post's edition.publishedAt, not post.createdAt
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
  circleJoinedAt: Date | null; // null = not a joined circle member
  isBlocked: boolean; // viewer<->author block, either direction
  isReported: boolean; // viewer reported this specific post
  isRecipient: boolean; // viewer is a named PostRecipient of this post
}) {
  const {
    viewerId,
    post,
    friendshipAcceptedAt,
    circleJoinedAt,
    isBlocked,
    isReported,
    isRecipient,
  } = args;

  // Blocked/reported wins over everything, including authorship.
  if (isBlocked) return false;
  if (isReported) return false;

  // Removed → no one
  if (post.status === "REMOVED") return false;

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
      // Must be a friend AND friendship must predate the post going live.
      // Gated on the post's publish date (edition.publishedAt), not the
      // draft's createdAt — a post drafted before the friendship began but
      // published after should still be visible.
      return (
        !!viewerId &&
        friendshipAcceptedAt !== null &&
        friendshipAcceptedAt <= (post.publishedAt ?? post.createdAt)
      );

    case "CIRCLE":
      // Same reasoning as FRIENDS: must be a current member AND membership
      // must predate the post going live, so joining a circle doesn't grant
      // retroactive access to its entire published history.
      return (
        !!viewerId &&
        circleJoinedAt !== null &&
        circleJoinedAt <= (post.publishedAt ?? post.createdAt)
      );

    case "RECIPIENTS":
      // The named recipient list *is* the visibility boundary — no
      // temporal recheck needed, it was already the point of eligibility
      // at send time (see republish spec).
      return !!viewerId && isRecipient;

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
        circleJoinedAt: null,
        isBlocked: false,
        isReported: false,
        isRecipient: false,
      }),
    );
  }

  const authorIds = Array.from(new Set(posts.map((p) => p.authorId)));
  const postIds = posts.map((p) => p.id);
  const circleIds = Array.from(
    new Set(posts.map((p) => p.circleId).filter((id): id is string => !!id)),
  );

  const [friendships, blocks, reports, joinedCircles, recipientOf] = await Promise.all([
    getAcceptedFriendships(viewerId),
    // One-directional by design (see docs/reference/product-spec.md
    // "Blocking & reporting"): blocking someone filters their content out of
    // *your* view, it doesn't hide your content from them.
    prisma.block.findMany({
      where: { blockerId: viewerId, blockedId: { in: authorIds } },
      select: { blockedId: true },
    }),
    prisma.report.findMany({
      where: {
        reporterId: viewerId,
        contentType: "POST",
        contentId: { in: postIds },
      },
      select: { contentId: true },
    }),
    circleIds.length > 0
      ? prisma.circleMember.findMany({
          where: {
            userId: viewerId,
            status: "JOINED",
            circleId: { in: circleIds },
          },
          select: { circleId: true, joinedAt: true },
        })
      : Promise.resolve([]),
    prisma.postRecipient.findMany({
      where: { userId: viewerId, postId: { in: postIds } },
      select: { postId: true },
    }),
  ]);

  const friendMap = new Map(friendships.map((f) => [f.friendId, f.acceptedAt]));
  const blockedAuthorIds = new Set(blocks.map((b) => b.blockedId));
  const reportedPostIds = new Set(reports.map((r) => r.contentId));
  const circleJoinedMap = new Map(joinedCircles.map((c) => [c.circleId, c.joinedAt]));
  const recipientPostIds = new Set(recipientOf.map((r) => r.postId));

  return posts.filter((post) =>
    canViewPostPolicy({
      viewerId,
      post,
      friendshipAcceptedAt: friendMap.get(post.authorId) ?? null,
      circleJoinedAt: post.circleId ? circleJoinedMap.get(post.circleId) ?? null : null,
      isBlocked: blockedAuthorIds.has(post.authorId),
      isReported: reportedPostIds.has(post.id),
      isRecipient: recipientPostIds.has(post.id),
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
      edition: { select: { publishedAt: true } },
    },
  });

  if (!post) {
    return null;
  }

  const { edition, ...postFields } = post;
  const allowed = await canViewPost(viewerId, {
    ...postFields,
    publishedAt: edition?.publishedAt ?? null,
  });

  if (!allowed) {
    return null;
  }

  return post;
}

//
// --------------------------------------------------
// 4️⃣ REPUBLISH ELIGIBILITY (inverse of the temporal gate)
// --------------------------------------------------
//

export type RepublishEligibleFriend = {
  id: string;
  username: string;
  image: string | null;
};

/**
 * Friends of `authorId` who currently CANNOT see `originalPost` — the
 * reverse-temporal republish checklist (see docs/specs/2026-08-13-republish.md).
 * Batched like resolveVisiblePosts (one query per input, not per-candidate).
 */
export async function getRepublishEligibleFriends(
  authorId: string,
  originalPost: MinimalPost,
): Promise<RepublishEligibleFriend[]> {
  // Open to everyone already — no one is "missing" it.
  if (originalPost.audienceType === "ALL_USERS") return [];

  const friendships = await getAcceptedFriendships(authorId);
  if (!friendships.length) return [];
  const friendIds = friendships.map((f) => f.friendId);

  const [blocks, circleJoined, users] = await Promise.all([
    prisma.block.findMany({
      where: {
        OR: [
          { blockerId: authorId, blockedId: { in: friendIds } },
          { blockerId: { in: friendIds }, blockedId: authorId },
        ],
      },
      select: { blockerId: true, blockedId: true },
    }),
    originalPost.audienceType === "CIRCLE" && originalPost.circleId
      ? prisma.circleMember.findMany({
          where: {
            circleId: originalPost.circleId,
            status: "JOINED",
            userId: { in: friendIds },
          },
          select: { userId: true, joinedAt: true },
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: { id: { in: friendIds } },
      select: { id: true, username: true, image: true },
    }),
  ]);

  const blockedFriendIds = new Set(
    blocks.flatMap((b) => [b.blockerId, b.blockedId]).filter((id) => id !== authorId),
  );
  const circleJoinedMap = new Map(circleJoined.map((c) => [c.userId, c.joinedAt]));
  const friendMap = new Map(friendships.map((f) => [f.friendId, f.acceptedAt]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Most-recently-accepted friend first — the friend you just added (the
  // friend-accept nudge's whole reason for existing) naturally floats to
  // the top of the checklist without any separate "pre-highlighted" mode.
  const eligibleFriendIds = friendIds
    .filter((friendId) => !blockedFriendIds.has(friendId))
    .filter((friendId) => {
      const canSee = canViewPostPolicy({
        viewerId: friendId,
        post: originalPost,
        friendshipAcceptedAt: friendMap.get(friendId) ?? null,
        circleJoinedAt: circleJoinedMap.get(friendId) ?? null,
        isBlocked: false,
        isReported: false,
        isRecipient: false,
      });
      return !canSee;
    })
    .sort((a, b) => {
      const aAt = friendMap.get(a)?.getTime() ?? 0;
      const bAt = friendMap.get(b)?.getTime() ?? 0;
      return bAt - aAt;
    });

  return eligibleFriendIds
    .map((id) => userMap.get(id))
    .filter((u): u is RepublishEligibleFriend => !!u);
}
