// src/lib/insights/roster.ts
//
// Bounded by user count, not history — every query here is either a
// groupBy (one row per user/post) or a full scan of a small table
// (friendships, published posts), safe to compute live per spec's
// "Roster's status flags ... bounded by user count (tiny)".

import { prisma } from "@/lib/prisma";
import { getAllUserStatuses, type StatusBand } from "./status";
import { getLastActivityMap } from "./activity";
import { POLLUTED_READ_TIMESTAMPS } from "./trackingStart";

export type RosterRow = {
  id: string;
  username: string;
  email: string;
  image: string | null;
  status: StatusBand;
  lastActiveAt: Date | null;
  joinedAt: Date;
  friends: number;
  isolated: boolean;
  wrote: number;
  reception: number;
  consumed: number;
};

const ISOLATED_THRESHOLD = 3;

const STATUS_PRIORITY: Record<StatusBand, number> = {
  SLIPPING: 0,
  DORMANT: 1,
  NEVER_ACTIVATED: 2,
  ONBOARDING: 3,
  ACTIVE: 4,
};

export async function getRoster(): Promise<RosterRow[]> {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, image: true, createdAt: true },
  });

  const [
    lastActivityMap,
    friendships,
    wroteRows,
    publishedPosts,
    readCountsByPost,
    commentCountsByPost,
    consumedRows,
  ] = await Promise.all([
    getLastActivityMap(),
    prisma.friendship.findMany({ where: { status: "ACCEPTED" }, select: { aId: true, bId: true } }),
    prisma.post.groupBy({ by: ["authorId"], where: { status: "PUBLISHED" }, _count: { _all: true } }),
    prisma.post.findMany({ where: { status: "PUBLISHED" }, select: { id: true, authorId: true } }),
    prisma.postRead.groupBy({
      by: ["postId"],
      where: { readAt: { notIn: POLLUTED_READ_TIMESTAMPS } },
      _count: { _all: true },
    }),
    prisma.comment.groupBy({ by: ["postId"], where: { status: "ACTIVE" }, _count: { _all: true } }),
    prisma.postRead.groupBy({
      by: ["userId"],
      where: { readAt: { notIn: POLLUTED_READ_TIMESTAMPS } },
      _count: { _all: true },
    }),
  ]);

  const statusMap = await getAllUserStatuses(users, lastActivityMap);

  const friendCount = new Map<string, number>();
  for (const f of friendships) {
    friendCount.set(f.aId, (friendCount.get(f.aId) ?? 0) + 1);
    friendCount.set(f.bId, (friendCount.get(f.bId) ?? 0) + 1);
  }

  const wroteMap = new Map(wroteRows.map((r) => [r.authorId, r._count._all]));

  const authorByPost = new Map(publishedPosts.map((p) => [p.id, p.authorId]));
  const receptionByAuthor = new Map<string, number>();
  for (const r of readCountsByPost) {
    const authorId = authorByPost.get(r.postId);
    if (authorId) receptionByAuthor.set(authorId, (receptionByAuthor.get(authorId) ?? 0) + r._count._all);
  }
  for (const r of commentCountsByPost) {
    const authorId = authorByPost.get(r.postId);
    if (authorId) receptionByAuthor.set(authorId, (receptionByAuthor.get(authorId) ?? 0) + r._count._all);
  }

  const consumedMap = new Map(consumedRows.map((r) => [r.userId, r._count._all]));

  const rows: RosterRow[] = users.map((u) => {
    const statusRow = statusMap.get(u.id);
    const friends = friendCount.get(u.id) ?? 0;
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      image: u.image,
      status: statusRow?.status ?? "ONBOARDING",
      lastActiveAt: statusRow?.lastActiveAt ?? null,
      joinedAt: u.createdAt,
      friends,
      isolated: friends < ISOLATED_THRESHOLD,
      wrote: wroteMap.get(u.id) ?? 0,
      reception: receptionByAuthor.get(u.id) ?? 0,
      consumed: consumedMap.get(u.id) ?? 0,
    };
  });

  rows.sort((a, b) => {
    const p = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
    if (p !== 0) return p;
    const aTime = a.lastActiveAt?.getTime() ?? 0;
    const bTime = b.lastActiveAt?.getTime() ?? 0;
    return bTime - aTime; // most-recently-lapsed first within a status group
  });

  return rows;
}
