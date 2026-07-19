// src/lib/home.ts
// Composition layer backing GET /api/home — the redesigned signed-in home
// page's three zones: edition hero, Coming Sunday, and per-post Buzz.

import { prisma } from "@/lib/prisma";
import { ActivityEventType } from "@/generated/prisma/enums";
import { getAcceptedFriendIds, getAcceptedFriendships } from "@/lib/friends";
import { resolveVisiblePosts } from "@/lib/access/postAccess";
import { getReadMapForPosts } from "@/lib/postReads";
import {
  getMostRecentPublishedEditionForUser,
  getPublishedEditionById,
  plannedPublishAt,
} from "@/lib/editions";
import { getWeekStartUTC } from "@/lib/utils";

// --- hero -------------------------------------------------------------

export type HeroState = "NOT_OPENED" | "PARTIAL" | "CAUGHT_UP";

export type HeroData =
  | { kind: "empty" }
  | {
      kind: "edition";
      editionId: string;
      isReleaseDay: boolean;
      totalCount: number;
      openedCount: number;
      state: HeroState;
      unreadPostIds: string[];
      teaserThumbUrls: string[];
    };

// NOTE: "release day" is a literal calendar-day match (LA time) against the
// edition's publishedAt. We could switch this to a rolling 24h-since-publish
// grace window later if literal-calendar-day copy feels wrong near midnight.
function isReleaseDay(publishedAt: Date | null, now: Date): boolean {
  if (!publishedAt) return false;
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" });
  return fmt(publishedAt) === fmt(now);
}

export async function getHeroData(userId: string): Promise<HeroData> {
  const latest = await getMostRecentPublishedEditionForUser();
  if (!latest) return { kind: "empty" };

  const edition = await getPublishedEditionById({ id: userId }, latest.id);
  if (!edition || edition.posts.length === 0) return { kind: "empty" };

  const postIds = edition.posts.map((p) => p.id);
  const readMap = await getReadMapForPosts(userId, postIds);

  const openedCount = readMap.size;
  const totalCount = postIds.length;
  const unreadPostIds = edition.posts
    .filter((p) => !readMap.has(p.id))
    .map((p) => p.id);

  const state: HeroState =
    openedCount === 0
      ? "NOT_OPENED"
      : openedCount < totalCount
        ? "PARTIAL"
        : "CAUGHT_UP";

  const teaserThumbUrls = edition.posts
    .map((p) => p.heroThumbBlurUrl)
    .filter((url): url is string => !!url);

  return {
    kind: "edition",
    editionId: edition.id,
    isReleaseDay: isReleaseDay(edition.publishedAt, new Date()),
    totalCount,
    openedCount,
    state,
    unreadPostIds,
    teaserThumbUrls,
  };
}

// --- coming sunday ------------------------------------------------------

export type ComingNextPost = {
  id: string;
  title: string;
  authorName: string;
  heroThumbBlurUrl: string | null;
  submittedAt: string;
  isOwn: boolean;
};

export type ComingNextData =
  | { visible: false }
  | {
      visible: true;
      posts: ComingNextPost[];
      hasSubmitted: boolean;
      friendsSubmittedCount: number;
      daysLeft: number;
    };

function computeDaysLeft(now: Date): number {
  const weekStart = getWeekStartUTC(now);
  const publishAt = plannedPublishAt(weekStart);
  const ms = publishAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export async function getComingNext(userId: string): Promise<ComingNextData> {
  const friendIds = await getAcceptedFriendIds(userId);

  const submitted = await prisma.post.findMany({
    where: {
      status: "SUBMITTED",
      OR: [{ authorId: userId }, { authorId: { in: friendIds } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      authorId: true,
      createdAt: true,
      heroThumbBlurUrl: true,
      author: { select: { id: true, name: true } },
    },
  });

  if (submitted.length === 0) return { visible: false };

  const own = submitted.filter((p) => p.authorId === userId);
  const others = submitted.filter((p) => p.authorId !== userId);
  const ordered = [...own, ...others];

  return {
    visible: true,
    posts: ordered.map((p) => ({
      id: p.id,
      title: p.title ?? "Untitled post",
      authorName: p.author.name ?? "Someone",
      heroThumbBlurUrl: p.heroThumbBlurUrl,
      submittedAt: p.createdAt.toISOString(),
      isOwn: p.authorId === userId,
    })),
    hasSubmitted: own.length > 0,
    friendsSubmittedCount: others.length,
    daysLeft: computeDaysLeft(new Date()),
  };
}

// --- buzz (per-post New buzz / Earlier) ----------------------------------

export type BuzzPostRow = {
  postId: string;
  title: string;
  authorName: string;
  heroThumbUrl: string | null;
  latestActivityAt: string;
  newCount: number;
};

export type BuzzPostsData = {
  newBuzz: BuzzPostRow[];
  earlier: BuzzPostRow[];
  earlierHasMore: boolean;
};

// Only comments/replies count as "activity" for Buzz — likes never resurface
// a post, and submit/publish events belong to the hero, not Buzz (a new post
// only enters Buzz once someone comments on it).
const BUZZ_ACTIVITY_TYPES: ActivityEventType[] = [
  ActivityEventType.POST_COMMENTED,
  ActivityEventType.COMMENT_REPLIED,
];

export async function getBuzzPosts(
  userId: string,
  opts: { earlierLimit?: number } = {},
): Promise<BuzzPostsData> {
  const earlierLimit = opts.earlierLimit ?? 15;

  const friendships = await getAcceptedFriendships(userId);
  if (!friendships.length) {
    return { newBuzz: [], earlier: [], earlierHasMore: false };
  }
  const friendMap = new Map(friendships.map((f) => [f.friendId, f.acceptedAt]));
  const friendIds = Array.from(friendMap.keys());

  // Mutual-friend path: comments from anyone on a friend's FRIENDS/CIRCLE post
  // (mirrors the same reasoning previously in src/lib/buzz.ts).
  const publishedPostsByFriends = await prisma.post.findMany({
    where: {
      authorId: { in: friendIds },
      status: "PUBLISHED",
      audienceType: { in: ["FRIENDS", "CIRCLE"] },
    },
    select: { id: true, authorId: true },
  });
  const mutualPostIds = publishedPostsByFriends.map((p) => p.id);

  const events = await prisma.activityEvent.findMany({
    where: {
      OR: [
        { actorId: { in: friendIds } },
        { postId: { in: mutualPostIds }, actorId: { not: userId } },
      ],
      eventType: { in: BUZZ_ACTIVITY_TYPES },
    },
    include: {
      post: {
        select: {
          id: true,
          title: true,
          authorId: true,
          status: true,
          audienceType: true,
          circleId: true,
          createdAt: true,
          heroThumbUrl: true,
          author: { select: { id: true, name: true, username: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Temporal gate: only count activity after the relevant friendship began.
  const temporallyGated = events.filter((e) => {
    const viewerFriendshipWithActor = friendMap.get(e.actorId);
    if (viewerFriendshipWithActor) return e.createdAt >= viewerFriendshipWithActor;
    if (e.post) {
      const viewerFriendshipWithAuthor = friendMap.get(e.post.authorId);
      if (viewerFriendshipWithAuthor)
        return e.createdAt >= viewerFriendshipWithAuthor;
    }
    return false;
  });

  const postsForAccess = temporallyGated
    .filter((e) => !!e.post)
    .map((e) => ({
      id: e.post!.id,
      authorId: e.post!.authorId,
      status: e.post!.status,
      audienceType: e.post!.audienceType,
      circleId: e.post!.circleId,
      createdAt: e.post!.createdAt,
    }));

  const visiblePosts = await resolveVisiblePosts({
    viewerId: userId,
    posts: postsForAccess,
  });
  const visiblePostIds = new Set(visiblePosts.map((p) => p.id));

  const visibleEvents = temporallyGated.filter(
    (e) => e.post && visiblePostIds.has(e.post.id),
  );

  type Grouped = {
    postId: string;
    title: string;
    authorName: string;
    heroThumbUrl: string | null;
    latestActivityAt: Date;
    activityTimes: Date[];
  };
  const grouped = new Map<string, Grouped>();
  for (const e of visibleEvents) {
    const p = e.post!;
    const existing = grouped.get(p.id);
    if (!existing) {
      grouped.set(p.id, {
        postId: p.id,
        title: p.title ?? "Untitled post",
        authorName: p.author.name ?? p.author.username ?? "Someone",
        heroThumbUrl: p.heroThumbUrl,
        latestActivityAt: e.createdAt,
        activityTimes: [e.createdAt],
      });
    } else {
      if (e.createdAt > existing.latestActivityAt) existing.latestActivityAt = e.createdAt;
      existing.activityTimes.push(e.createdAt);
    }
  }

  const postIds = Array.from(grouped.keys());
  const readMap = await getReadMapForPosts(userId, postIds);

  const newBuzz: BuzzPostRow[] = [];
  const earlierAll: BuzzPostRow[] = [];

  for (const g of Array.from(grouped.values())) {
    const readAt = readMap.get(g.postId) ?? null;
    const unread = !readAt || g.latestActivityAt > readAt;
    const newCount = g.activityTimes.filter((t: Date) => !readAt || t > readAt).length;
    const row: BuzzPostRow = {
      postId: g.postId,
      title: g.title,
      authorName: g.authorName,
      heroThumbUrl: g.heroThumbUrl,
      latestActivityAt: g.latestActivityAt.toISOString(),
      newCount,
    };
    (unread ? newBuzz : earlierAll).push(row);
  }

  const byRecency = (a: BuzzPostRow, b: BuzzPostRow) =>
    new Date(b.latestActivityAt).getTime() - new Date(a.latestActivityAt).getTime();

  newBuzz.sort(byRecency);
  earlierAll.sort(byRecency);

  return {
    newBuzz,
    earlier: earlierAll.slice(0, earlierLimit),
    earlierHasMore: earlierAll.length > earlierLimit,
  };
}

// --- combined ----------------------------------------------------------

export type HomeData = {
  hero: HeroData;
  comingNext: ComingNextData;
  buzz: BuzzPostsData;
};

export async function getHomeData(
  userId: string,
  opts: { earlierLimit?: number } = {},
): Promise<HomeData> {
  const [hero, comingNext, buzz] = await Promise.all([
    getHeroData(userId),
    getComingNext(userId),
    getBuzzPosts(userId, opts),
  ]);

  return { hero, comingNext, buzz };
}
