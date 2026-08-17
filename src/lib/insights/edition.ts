// src/lib/insights/edition.ts
//
// Computes the full per-edition summary — Topline contribution + Funnel
// numerators — for one edition. Used two ways: (a) called once per sealed
// edition (from the publish-weekly cron) and persisted to EditionSummary,
// (b) called live, unpersisted, for the current/unsealed edition when the
// Topline or Funnel needs "this week" data (spec: only the current edition
// and Roster status compute live — everything else reads stored rows).

import { prisma } from "@/lib/prisma";
import { extractTextFromDoc } from "@/lib/contentFilter";
import { resolveVisiblePosts, type MinimalPost } from "@/lib/access/postAccess";
import { getActiveUserIdsAsOf } from "./status";
import { getAllEditionsWithWindows, getPreviousEditionId, type EditionWithWindow } from "./windows";
import { mapWithConcurrency } from "./concurrency";
import { READ_TRACKING_START, POLLUTED_READ_TIMESTAMPS } from "./trackingStart";

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export type EditionSummaryData = {
  totalUsers: number;
  newSignups: number;
  activeUsers: number;
  postsCount: number;
  wordsWritten: number;
  wordsRead: number;
  funnelAllUsers: number;
  funnelActive: number;
  funnelOpened: number;
  funnelRead: number;
  funnelReadAll: number;
  funnelCommented: number;
  funnelWrote: number;
};

export async function computeEditionSummary(editionId: string): Promise<EditionSummaryData> {
  const all = await getAllEditionsWithWindows();
  const idx = all.findIndex((e) => e.id === editionId);
  if (idx === -1) throw new Error(`computeEditionSummary: unknown edition ${editionId}`);
  const target: EditionWithWindow = all[idx];
  const trailing3 = all.slice(Math.max(0, idx - 2), idx + 1);

  // Read-tracking (PostRead) didn't exist before READ_TRACKING_START — its
  // seed backfill mass-wrote a PostRead row for every post x every user, so
  // any edition whose window started before that point has no trustworthy
  // read data. Every other metric (users, posts, wordsWritten, funnelWrote/
  // Commented) is unaffected and still reported for full history.
  const hasReadTracking = target.windowStart >= READ_TRACKING_START;

  const [totalUsers, newSignups, activeUserIds] = await Promise.all([
    prisma.user.count({ where: { createdAt: { lte: target.windowEnd } } }),
    prisma.user.count({
      where: { createdAt: { gte: target.windowStart, lt: target.windowEnd } },
    }),
    getActiveUserIdsAsOf(trailing3),
  ]);

  const [editionPosts, commentsInWindow, readsInWindow, opens] = await Promise.all([
    prisma.post.findMany({
      where: { editionId: target.id, status: "PUBLISHED" },
      select: {
        id: true,
        authorId: true,
        content: true,
        audienceType: true,
        circleId: true,
        createdAt: true,
      },
    }),
    prisma.comment.findMany({
      where: {
        createdAt: { gte: target.windowStart, lt: target.windowEnd },
        status: "ACTIVE",
      },
      select: { authorId: true, postId: true, content: true },
    }),
    hasReadTracking
      ? prisma.postRead.findMany({
          where: {
            readAt: {
              gte: target.windowStart,
              lt: target.windowEnd,
              notIn: POLLUTED_READ_TIMESTAMPS,
            },
          },
          select: { postId: true, userId: true },
        })
      : Promise.resolve([] as { postId: string; userId: string }[]),
    prisma.editionView.findMany({
      where: { editionId: target.id },
      select: { userId: true },
    }),
  ]);

  // Words written: this edition's posts + comments authored during its window.
  const postWords = editionPosts.reduce(
    (sum, p) => sum + countWords(extractTextFromDoc(p.content)),
    0,
  );
  const commentWords = commentsInWindow.reduce((sum, c) => sum + countWords(c.content), 0);
  const wordsWritten = postWords + commentWords;

  // Words read: any post read during this edition's window, weighted by
  // that post's word count (a post from any edition — this is a
  // consumption-over-time number, not scoped to this edition's own posts).
  const readPostIds = Array.from(new Set(readsInWindow.map((r) => r.postId)));
  const readPosts = readPostIds.length
    ? await prisma.post.findMany({
        where: { id: { in: readPostIds } },
        select: { id: true, content: true },
      })
    : [];
  const wordsByPostId = new Map(
    readPosts.map((p) => [p.id, countWords(extractTextFromDoc(p.content))]),
  );
  const wordsRead = readsInWindow.reduce(
    (sum, r) => sum + (wordsByPostId.get(r.postId) ?? 0),
    0,
  );

  // Funnel.
  const viewedUserIds = new Set(opens.map((o) => o.userId));
  const openerIds = new Set(
    Array.from(activeUserIds).filter((id) => viewedUserIds.has(id)),
  );

  const editionPostIdSet = new Set(editionPosts.map((p) => p.id));
  const editionReads = hasReadTracking
    ? await prisma.postRead.findMany({
        where: {
          postId: { in: Array.from(editionPostIdSet) },
          readAt: { notIn: POLLUTED_READ_TIMESTAMPS },
        },
        select: { postId: true, userId: true },
      })
    : [];
  const readSetByUser = new Map<string, Set<string>>();
  for (const r of editionReads) {
    if (!readSetByUser.has(r.userId)) readSetByUser.set(r.userId, new Set());
    readSetByUser.get(r.userId)!.add(r.postId);
  }

  const commentedUserIds = new Set(
    commentsInWindow.filter((c) => editionPostIdSet.has(c.postId)).map((c) => c.authorId),
  );

  const minimalPosts: MinimalPost[] = editionPosts.map((p) => ({
    id: p.id,
    authorId: p.authorId,
    status: "PUBLISHED",
    audienceType: p.audienceType,
    circleId: p.circleId,
    createdAt: p.createdAt,
    publishedAt: target.publishedAt,
  }));

  // Per-opener "did they read everything available to them" check — each
  // one is its own resolveVisiblePosts call (friendships/blocks/circles),
  // so fan these out concurrently rather than one at a time. Skipped
  // entirely pre-READ_TRACKING_START since there's no real read data to
  // check against.
  const openerResults = hasReadTracking
    ? await mapWithConcurrency(Array.from(openerIds), 8, async (uid) => {
        const readSet = readSetByUser.get(uid) ?? new Set<string>();
        const visible = await resolveVisiblePosts({ viewerId: uid, posts: minimalPosts });
        return {
          hasRead: readSet.size > 0,
          readAll: visible.length > 0 && visible.every((p) => readSet.has(p.id)),
        };
      })
    : [];
  const funnelCommented = Array.from(commentedUserIds).filter((id) => openerIds.has(id)).length;

  const editionAuthorIds = new Set(editionPosts.map((p) => p.authorId));
  const funnelWrote = Array.from(editionAuthorIds).filter((id) => activeUserIds.has(id)).length;

  const funnelRead = openerResults.filter((r) => r.hasRead).length;
  const funnelReadAll = openerResults.filter((r) => r.readAll).length;

  return {
    totalUsers,
    newSignups,
    activeUsers: activeUserIds.size,
    postsCount: editionPosts.length,
    wordsWritten,
    wordsRead: hasReadTracking ? wordsRead : 0,
    funnelAllUsers: totalUsers,
    funnelActive: activeUserIds.size,
    funnelOpened: openerIds.size,
    funnelRead,
    funnelReadAll,
    funnelCommented,
    funnelWrote,
  };
}

/**
 * Called from the publish-weekly cron after a new edition publishes: the
 * *previous* edition's reading window has now fully elapsed (a sealed
 * edition), so compute and persist its summary if it doesn't have one yet.
 * Idempotent — safe to call every cron run.
 */
export async function computeAndStoreSealedEditionSummary(currentEditionId: string) {
  const current = await prisma.edition.findUnique({
    where: { id: currentEditionId },
    select: { weekStart: true },
  });
  if (!current) return { skipped: true, reason: "CURRENT_EDITION_NOT_FOUND" as const };

  const previousEditionId = await getPreviousEditionId(current.weekStart);
  if (!previousEditionId) return { skipped: true, reason: "NO_PREVIOUS_EDITION" as const };

  const existing = await prisma.editionSummary.findUnique({
    where: { editionId: previousEditionId },
    select: { editionId: true },
  });
  if (existing) return { skipped: true, reason: "ALREADY_COMPUTED" as const };

  const data = await computeEditionSummary(previousEditionId);
  await prisma.editionSummary.upsert({
    where: { editionId: previousEditionId },
    create: { editionId: previousEditionId, ...data },
    update: data,
  });
  return { skipped: false, editionId: previousEditionId };
}

/**
 * One-time (or as-needed) catch-up: computes and persists EditionSummary
 * for every *sealed* edition that doesn't have one yet, instead of waiting
 * for the weekly cron to trickle through one edition at a time. The current
 * (unsealed) edition is deliberately excluded — it's always computed live,
 * never persisted, since its window is still open.
 *
 * Admin-triggered (see /api/admin/insights/backfill) — safe to re-run,
 * already-computed editions are skipped.
 */
export async function backfillEditionSummaries(): Promise<{
  computed: number;
  alreadyPresent: number;
  editionIds: string[];
}> {
  const editions = await getAllEditionsWithWindows();
  const sealed = editions.filter((e) => e.isSealed);
  if (sealed.length === 0) return { computed: 0, alreadyPresent: 0, editionIds: [] };

  const existing = await prisma.editionSummary.findMany({
    where: { editionId: { in: sealed.map((e) => e.id) } },
    select: { editionId: true },
  });
  const existingIds = new Set(existing.map((e) => e.editionId));
  const missing = sealed.filter((e) => !existingIds.has(e.id));

  // Cap concurrency at the edition level too — each edition's own
  // computation already fans out per-opener queries (see above), so running
  // every missing edition at once would multiply that back out.
  const computedIds = await mapWithConcurrency(missing, 3, async (e) => {
    const data = await computeEditionSummary(e.id);
    await prisma.editionSummary.upsert({
      where: { editionId: e.id },
      create: { editionId: e.id, ...data },
      update: data,
    });
    return e.id;
  });

  return {
    computed: computedIds.length,
    alreadyPresent: existingIds.size,
    editionIds: computedIds,
  };
}
