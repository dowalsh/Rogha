// src/lib/insights/activity.ts
//
// The shared "did something" primitive — see the Activity definition in
// docs/specs/2026-08-17-admin-insights-dashboard.md: reading a post, liking,
// commenting, publishing a post, or having a Jam track captured. Opening the
// edition front page alone does NOT count (EditionView is deliberately
// excluded here).

import { prisma } from "@/lib/prisma";

/**
 * User ids with at least one activity event in [start, end). Five bounded
 * range queries — cheap as long as the window is small (a few weeks), which
 * is how every caller uses it (one edition's reading window at a time).
 */
export async function getActivityInRange(start: Date, end: Date): Promise<Set<string>> {
  const range = { gte: start, lt: end };

  const [reads, postLikes, commentLikes, comments, posts, jamTracks] = await Promise.all([
    prisma.postRead.findMany({ where: { readAt: range }, select: { userId: true } }),
    prisma.postLike.findMany({ where: { createdAt: range }, select: { userId: true } }),
    prisma.commentLike.findMany({ where: { createdAt: range }, select: { userId: true } }),
    prisma.comment.findMany({
      where: { createdAt: range, status: "ACTIVE" },
      select: { authorId: true },
    }),
    prisma.post.findMany({
      where: { createdAt: range, status: "PUBLISHED" },
      select: { authorId: true },
    }),
    prisma.weeklyTrack.findMany({ where: { capturedAt: range }, select: { userId: true } }),
  ]);

  const ids = new Set<string>();
  for (const r of reads) ids.add(r.userId);
  for (const r of postLikes) ids.add(r.userId);
  for (const r of commentLikes) ids.add(r.userId);
  for (const r of comments) ids.add(r.authorId);
  for (const r of posts) ids.add(r.authorId);
  for (const r of jamTracks) ids.add(r.userId);
  return ids;
}

/**
 * Last-activity timestamp per user, across all history — six `_max` groupBy
 * queries, each fully satisfied by an index and returning one row per user
 * (not a range scan), so this stays cheap regardless of total event volume.
 */
export async function getLastActivityMap(): Promise<Map<string, Date>> {
  const [reads, postLikes, commentLikes, comments, posts, jamTracks] = await Promise.all([
    prisma.postRead.groupBy({ by: ["userId"], _max: { readAt: true } }),
    prisma.postLike.groupBy({ by: ["userId"], _max: { createdAt: true } }),
    prisma.commentLike.groupBy({ by: ["userId"], _max: { createdAt: true } }),
    prisma.comment.groupBy({
      by: ["authorId"],
      where: { status: "ACTIVE" },
      _max: { createdAt: true },
    }),
    prisma.post.groupBy({
      by: ["authorId"],
      where: { status: "PUBLISHED" },
      _max: { createdAt: true },
    }),
    prisma.weeklyTrack.groupBy({ by: ["userId"], _max: { capturedAt: true } }),
  ]);

  const map = new Map<string, Date>();
  const bump = (userId: string, at: Date | null | undefined) => {
    if (!at) return;
    const cur = map.get(userId);
    if (!cur || at > cur) map.set(userId, at);
  };

  for (const r of reads) bump(r.userId, r._max.readAt);
  for (const r of postLikes) bump(r.userId, r._max.createdAt);
  for (const r of commentLikes) bump(r.userId, r._max.createdAt);
  for (const r of comments) bump(r.authorId, r._max.createdAt);
  for (const r of posts) bump(r.authorId, r._max.createdAt);
  for (const r of jamTracks) bump(r.userId, r._max.capturedAt);

  return map;
}
