// src/lib/insights/userDrilldown.ts
//
// The per-user post-mortem (spec: "the per-user drill-down"). One user at a
// time — bounded, safe to compute live.

import { prisma } from "@/lib/prisma";
import { getAllUserStatuses, type StatusBand } from "./status";
import { getLastActivityMap } from "./activity";

const ISOLATED_THRESHOLD = 3;

export type UserInsights = {
  id: string;
  username: string;
  email: string;
  image: string | null;
  joinedAt: Date;
  status: StatusBand;
  lastActiveAt: Date | null;
  headline: string;

  network: {
    friends: number;
    isolated: boolean;
    pendingIncoming: number;
    pendingOutgoing: number;
    circles: { id: string; name: string }[];
  };

  posts: {
    id: string;
    title: string | null;
    status: string;
    editionTitle: string | null;
    createdAt: Date;
    reads: number;
    comments: number;
    likes: number;
  }[];

  reception: { totalReads: number; totalComments: number; totalLikes: number };

  consumed: { postsRead: number; commentsGiven: number; likesGiven: number };

  timeline: {
    lastPostRead: Date | null;
    lastPostWritten: Date | null;
    lastCommentGiven: Date | null;
  };
};

export async function getUserInsights(userId: string): Promise<UserInsights | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, email: true, image: true, createdAt: true },
  });
  if (!user) return null;

  const [
    lastActivityMap,
    friendCount,
    pendingIncoming,
    pendingOutgoing,
    circleMemberships,
    posts,
    readsGiven,
    commentsGiven,
    postLikesGiven,
    commentLikesGiven,
    lastPostRead,
    lastCommentGiven,
  ] = await Promise.all([
    getLastActivityMap(),
    prisma.friendship.count({
      where: { status: "ACCEPTED", OR: [{ aId: userId }, { bId: userId }] },
    }),
    prisma.friendship.count({
      where: {
        status: "PENDING",
        requesterId: { not: userId },
        OR: [{ aId: userId }, { bId: userId }],
      },
    }),
    prisma.friendship.count({ where: { status: "PENDING", requesterId: userId } }),
    prisma.circleMember.findMany({
      where: { userId, status: "JOINED" },
      select: { circle: { select: { id: true, name: true } } },
    }),
    prisma.post.findMany({
      where: { authorId: userId, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        edition: { select: { title: true, weekStart: true } },
        _count: { select: { postReads: true, comments: true, likes: true } },
      },
    }),
    prisma.postRead.count({ where: { userId } }),
    prisma.comment.count({ where: { authorId: userId, status: "ACTIVE" } }),
    prisma.postLike.count({ where: { userId } }),
    prisma.commentLike.count({ where: { userId } }),
    prisma.postRead.findFirst({
      where: { userId },
      orderBy: { readAt: "desc" },
      select: { readAt: true },
    }),
    prisma.comment.findFirst({
      where: { authorId: userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const statusMap = await getAllUserStatuses([user], lastActivityMap);
  const statusRow = statusMap.get(user.id);
  const status = statusRow?.status ?? "ONBOARDING";
  const lastActiveAt = statusRow?.lastActiveAt ?? null;

  const postsWithReception = posts.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    editionTitle: p.edition?.title ?? null,
    createdAt: p.createdAt,
    reads: p._count.postReads,
    comments: p._count.comments,
    likes: p._count.likes,
  }));

  const totalReads = postsWithReception.reduce((s, p) => s + p.reads, 0);
  const totalComments = postsWithReception.reduce((s, p) => s + p.comments, 0);
  const totalLikes = postsWithReception.reduce((s, p) => s + p.likes, 0);

  const lastPostWritten = posts[0]?.createdAt ?? null;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    image: user.image,
    joinedAt: user.createdAt,
    status,
    lastActiveAt,
    headline: buildHeadline({ status, posts: postsWithReception }),

    network: {
      friends: friendCount,
      isolated: friendCount < ISOLATED_THRESHOLD,
      pendingIncoming,
      pendingOutgoing,
      circles: circleMemberships.map((m) => m.circle),
    },

    posts: postsWithReception,
    reception: { totalReads, totalComments, totalLikes },
    consumed: {
      postsRead: readsGiven,
      commentsGiven,
      likesGiven: postLikesGiven + commentLikesGiven,
    },
    timeline: {
      lastPostRead: lastPostRead?.readAt ?? null,
      lastPostWritten,
      lastCommentGiven: lastCommentGiven?.createdAt ?? null,
    },
  };
}

function buildHeadline(args: {
  status: StatusBand;
  posts: { comments: number; reads: number }[];
}): string {
  const { status, posts } = args;

  if (status === "NEVER_ACTIVATED") return "Signed up, never became active.";
  if (status === "ONBOARDING") return "Just joined — too early to tell.";

  if (posts.length > 0) {
    const recentUnheard = posts.slice(0, 3).every((p) => p.comments === 0);
    if (recentUnheard && status !== "ACTIVE") {
      return "Went quiet — their last few posts got no comments.";
    }
    if (recentUnheard) {
      return "Posting, but recent posts haven't gotten comments.";
    }
  }

  if (status === "SLIPPING") return "Was a regular, has now missed the last two editions.";
  if (status === "DORMANT") return "Inactive for 3+ editions.";
  return "Active and engaged.";
}
