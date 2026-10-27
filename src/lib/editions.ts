// src/lib/editions.ts
import { prisma } from "@/lib/prisma";
import { getWeekStartUTC, formatWeekLabel } from "@/lib/utils";
import { recordActivityEvent } from "@/actions/activityEvent.action";
import { ActivityEventType } from "@/generated/prisma/enums";
import { getAcceptedFriendships } from "@/lib/friends";
import { getReadMapForPosts } from "@/lib/postReads";
import {
  buildAudienceCandidateWhere,
  getRecipientPostIds,
  buildReaderVisibleCircles,
} from "@/lib/access/postAccess";
import { getWeeklyJamForEdition, hasViewedWeeklyJam } from "@/lib/jam";
import { hashToIndex } from "@/lib/jam-preview";
import type { Prisma } from "@/generated/prisma/client";
import {
  nextRevealAt,
  revealAtForWeekStart,
  weekStartForReveal,
  livePostWhere,
  revealedEditionWhere,
} from "@/lib/reveal";

type DbUser = { id: string };

/**
 * The edition a post submitted at `now` belongs to — the one revealing at
 * the next Sunday 07:00 UTC — created on first use with that fixed reveal
 * instant as its publishedAt (see src/lib/reveal.ts). Called at submit time
 * so read access never waits on the cron.
 */
export async function getOrCreateUpcomingEdition(
  tx: Prisma.TransactionClient,
  now: Date = new Date(),
) {
  const revealAt = nextRevealAt(now);
  const weekStart = weekStartForReveal(revealAt);
  const edition = await tx.edition.upsert({
    where: { weekStart },
    update: {},
    create: {
      weekStart,
      title: `Week of ${formatWeekLabel(weekStart)}`,
      publishedAt: revealAt,
    },
    select: { id: true, publishedAt: true },
  });
  // A row the old cron created without posts never got a publishedAt.
  if (!edition.publishedAt) {
    await tx.edition.update({
      where: { id: edition.id },
      data: { publishedAt: revealAt },
    });
  }
  return edition;
}

/**
 * The Sunday live-join window: opens at the most recent Sunday 07:00 UTC
 * (the reveal instant the cron publishes at) and seals 24h later, Monday
 * 07:00 UTC — see docs/specs/2026-08-13-sunday-live-join.md.
 */
export function getSundayLiveJoinWindow(now: Date = new Date()) {
  const day = now.getUTCDay(); // 0 = Sunday … 6 = Saturday
  const hour = now.getUTCHours();
  // Days back to the most recent Sunday 07:00 UTC <= now.
  const daysBack = day === 0 && hour < 7 ? 7 : day;

  const windowStart = new Date(now);
  windowStart.setUTCDate(now.getUTCDate() - daysBack);
  windowStart.setUTCHours(7, 0, 0, 0);

  const windowEnd = new Date(windowStart);
  windowEnd.setUTCDate(windowStart.getUTCDate() + 1);

  return { windowStart, windowEnd, isOpen: now >= windowStart && now < windowEnd };
}

/**
 * The edition currently open for Sunday live joins, if any — the edition
 * whose (fixed) publishedAt is this morning's reveal. Returns null when the
 * window is closed or nobody submitted to this week's edition.
 */
export async function getOpenLiveJoinEdition(now: Date = new Date()) {
  const { windowStart, windowEnd, isOpen } = getSundayLiveJoinWindow(now);
  if (!isOpen) return null;

  return prisma.edition.findFirst({
    where: { publishedAt: { gte: windowStart, lt: windowEnd } },
    orderBy: { publishedAt: "desc" },
    select: { id: true, publishedAt: true },
  });
}

/**
 * The cron's half of the weekly reveal for the given weekStart. Read access
 * doesn't depend on this having run — posts carry their edition from
 * submit time and go live at its fixed publishedAt (see src/lib/reveal.ts).
 * This only records what already happened:
 *   1. Ensure the edition exists with its fixed reveal instant.
 *   2. Attach any legacy SUBMITTED posts with no edition (submitted before
 *      submit-time assignment existed) — only once the edition is due.
 *   3. Flip every SUBMITTED post whose edition has revealed to PUBLISHED
 *      (any edition, so a missed cron run catches up) and record
 *      POST_PUBLISHED activity for each.
 * `published` is true when this run flipped anything — the caller's cue to
 * send the edition email — so a re-run doesn't email twice.
 */
export async function publishEditionForWeek(weekStart: Date, now: Date = new Date()) {
  console.debug("[publishEditionForWeek] weekStart:", weekStart);
  const revealAt = revealAtForWeekStart(weekStart);

  return prisma.$transaction(async (tx) => {
    // 1. Upsert edition with its fixed reveal instant
    const edition = await tx.edition.upsert({
      where: { weekStart },
      update: {},
      create: {
        weekStart,
        title: `Week of ${formatWeekLabel(weekStart)}`,
        publishedAt: revealAt,
      },
      select: { id: true, publishedAt: true },
    });
    if (!edition.publishedAt) {
      await tx.edition.update({
        where: { id: edition.id },
        data: { publishedAt: revealAt },
      });
    }

    console.debug("[publishEditionForWeek] edition:", edition);

    // 2. Legacy safety net: unattached submissions join this edition once due
    if (revealAt <= now) {
      await tx.post.updateMany({
        where: { status: "SUBMITTED", editionId: null },
        data: { editionId: edition.id },
      });
    }

    // 3. Flip everything that's already live by time to PUBLISHED
    const submittedPosts = await tx.post.findMany({
      where: { status: "SUBMITTED", edition: { publishedAt: { lte: now } } },
      select: { id: true, authorId: true },
    });

    console.debug(
      "[publishEditionForWeek] due submitted posts:",
      submittedPosts.map((p) => p.id)
    );

    if (submittedPosts.length === 0) {
      return {
        ok: true,
        published: false,
        reason: "NO_DUE_POSTS",
        editionId: edition.id,
        postsPublished: 0,
      };
    }

    const { count: promotedCount } = await tx.post.updateMany({
      where: {
        id: { in: submittedPosts.map((p) => p.id) },
      },
      data: { status: "PUBLISHED" },
    });

    console.debug(
      "[publishEditionForWeek] promoted SUBMITTED posts:",
      promotedCount
    );

    for (const post of submittedPosts) {
      try {
        await recordActivityEvent({
          actorId: post.authorId, // the post's author
          eventType: ActivityEventType.POST_PUBLISHED,
          postId: post.id,
          // no commentId for publish events
        });
      } catch (err) {
        console.error("[PUBLISH_EDITION] ActivityEvent error", {
          postId: post.id,
          authorId: post.authorId,
          err,
        });
      }
    }

    return {
      ok: true,
      published: promotedCount > 0,
      reason: "PROMOTED",
      editionId: edition.id,
      postsPublished: promotedCount,
    };
  });
}

export async function getPublishedEditions(user: DbUser) {
  const now = new Date();
  const friendships = await getAcceptedFriendships(user.id);
  const friendMap = new Map(friendships.map((f) => [f.friendId, f.acceptedAt]));
  const friendIds = Array.from(friendMap.keys());

  const circleMemberships = await prisma.circleMember.findMany({
    where: { userId: user.id, status: "JOINED" },
    select: { circleId: true, joinedAt: true },
  });
  const circleJoinedMap = new Map(circleMemberships.map((c) => [c.circleId, c.joinedAt]));
  const myCircleIds = Array.from(circleJoinedMap.keys());

  // Blocks/reports for this viewer, fetched once (mirrors postAccess.ts).
  // Block is one-directional by design (docs/reference/product-spec.md):
  // blocking someone filters their content out of *your* view only.
  const [blocks, reports] = await Promise.all([
    prisma.block.findMany({
      where: { blockerId: user.id },
      select: { blockedId: true },
    }),
    prisma.report.findMany({
      where: { reporterId: user.id, contentType: "POST" },
      select: { contentId: true },
    }),
  ]);
  const blockedAuthorIds = new Set(blocks.map((b) => b.blockedId));
  const reportedPostIds = new Set(reports.map((r) => r.contentId));
  const jamCandidateIds = [user.id, ...friendIds].filter((id) => !blockedAuthorIds.has(id));
  const recipientPostIds = await getRecipientPostIds(user.id);
  const recipientPostIdSet = new Set(recipientPostIds);

  const editions = await prisma.edition.findMany({
    where: revealedEditionWhere(now),
    orderBy: { weekStart: "desc" },
    select: { id: true, title: true, weekStart: true, publishedAt: true },
  });

  return Promise.all(
    editions.map(async (ed) => {
      const posts = await prisma.post.findMany({
        where: {
          editionId: ed.id,
          AND: [livePostWhere(now)],
          OR: buildAudienceCandidateWhere(user.id, friendIds, myCircleIds, recipientPostIds),
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          createdAt: true,
          authorId: true,
          audienceType: true,
          postCircles: { select: { circleId: true } },
          officialKind: true,
          author: {
            select: { id: true, username: true, image: true },
          },
        },
      });

      // Audience + temporal + block/report gate — mirrors postAccess.ts's
      // canViewPostPolicy so this list stays consistent with the single-post
      // and other feed read paths.
      const visiblePosts = posts.filter((p) => {
        if (blockedAuthorIds.has(p.authorId)) return false;
        if (reportedPostIds.has(p.id)) return false;
        if (p.authorId === user.id) return true;
        if (p.audienceType === "ALL_USERS") return true;
        if (p.audienceType === "CIRCLE") {
          return p.postCircles.some((pc) => {
            const joinedAt = circleJoinedMap.get(pc.circleId);
            return joinedAt !== undefined && joinedAt <= (ed.publishedAt ?? p.createdAt);
          });
        }
        if (p.audienceType === "RECIPIENTS") {
          return recipientPostIdSet.has(p.id);
        }
        // FRIENDS
        const friendshipDate = friendMap.get(p.authorId);
        return friendshipDate !== undefined && friendshipDate <= (ed.publishedAt ?? p.createdAt);
      });

      const jamTracks = await prisma.weeklyTrack.findMany({
        where: { editionId: ed.id, userId: { in: jamCandidateIds } },
        select: { userId: true, imageUrl: true },
      });
      // Random pick across the whole group (not just the viewer's own row) so
      // non-connected viewers still get a cover — see jamPreviewFromRows for
      // the client-safe version of this same logic, kept deterministic per
      // edition so it doesn't flicker across reloads.
      const jamImages = jamTracks
        .map((t) => t.imageUrl)
        .filter((url): url is string => url != null);
      const weeklyJam = {
        hasData: jamTracks.length > 0,
        ownImageUrl:
          jamImages.length > 0
            ? jamImages[hashToIndex(ed.id, jamImages.length)]
            : null,
      };

      // Official posts (Editor's Note / Community Feature) sort last,
      // mirroring the Jam's fixed bottom slot — see docs/specs/2026-08-07-official-posts.md.
      const orderedPosts = [...visiblePosts].sort((a, b) => {
        const aOfficial = a.officialKind != null ? 1 : 0;
        const bOfficial = b.officialKind != null ? 1 : 0;
        return aOfficial - bOfficial;
      });

      console.debug(
        "[getPublishedEditions] edition:",
        ed.id,
        "posts:",
        orderedPosts.length
      );
      // status is the effective one — a live post may still read SUBMITTED
      // until the cron's lagging flip (see src/lib/reveal.ts).
      const livePosts = orderedPosts.map((p) => ({ ...p, status: "PUBLISHED" as const }));
      return { ...ed, posts: livePosts, weeklyJam };
    })
  );
}

export async function getPublishedEditionById(user: DbUser, id: string) {
  const now = new Date();
  // 1) Friendships with dates for temporal gating
  const friendships = await getAcceptedFriendships(user.id);
  const friendMap = new Map(friendships.map((f) => [f.friendId, f.acceptedAt]));
  const validFriendIds = Array.from(friendMap.keys());

  // 2) Edition shell
  const edition = await prisma.edition.findUnique({
    where: { id },
    select: { id: true, title: true, weekStart: true, publishedAt: true },
  });
  if (!edition) return null;
  // Not revealed yet — its edition row exists from the week's first submit
  if (!edition.publishedAt || edition.publishedAt > now) return null;

  // 3) Circles the viewer is part of (for CIRCLE audience), with joinedAt
  //    for the temporal gate below
  const circleMemberships = await prisma.circleMember.findMany({
    where: { userId: user.id, status: "JOINED" },
    select: { circleId: true, joinedAt: true },
  });
  const circleJoinedMap = new Map(circleMemberships.map((c) => [c.circleId, c.joinedAt]));
  const myCircleIds = Array.from(circleJoinedMap.keys());
  const recipientPostIds = await getRecipientPostIds(user.id);
  const recipientPostIdSet = new Set(recipientPostIds);

  // 4) Audience filter
  // - Author can see their own posts
  // - ALL_USERS is open to everyone
  // - FRIENDS requires accepted friendship with author
  // - CIRCLE requires viewer to be JOINED in that circle
  // - RECIPIENTS requires viewer to be a named PostRecipient (republish)

  const posts = await prisma.post.findMany({
    where: {
      editionId: edition.id,
      AND: [livePostWhere(now)],
      OR: buildAudienceCandidateWhere(user.id, validFriendIds, myCircleIds, recipientPostIds),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      createdAt: true,
      authorId: true,
      audienceType: true,
      postCircles: { select: { circleId: true, circle: { select: { id: true, name: true } } } },
      officialKind: true,
      author: { select: { id: true, clerkId: true, username: true, image: true } },
      heroImageUrl: true,
      heroThumbUrl: true,
      heroThumbBlurUrl: true,
      content: true,
      republishedFromPostId: true,
      republishedFrom: { select: { edition: { select: { publishedAt: true } } } },
      _count: { select: { likes: true } },
      likes: { where: { userId: user.id }, select: { id: true } },
    },
  });

  // Reported post IDs + blocked author IDs for this viewer (either block direction)
  const [reportedPostIds, blocks] = await Promise.all([
    prisma.report
      .findMany({ where: { reporterId: user.id, contentType: "POST" }, select: { contentId: true } })
      .then((rows) => new Set(rows.map((r) => r.contentId))),
    // Block is one-directional by design (docs/reference/product-spec.md):
    // blocking someone filters their content out of *your* view only.
    prisma.block.findMany({
      where: { blockerId: user.id },
      select: { blockedId: true },
    }),
  ]);
  const blockedAuthorIds = new Set(blocks.map((b) => b.blockedId));

  // Temporal gate + reporter/block exclusion
  const visiblePosts = posts
    .filter((p) => {
      if (reportedPostIds.has(p.id)) return false;
      if (blockedAuthorIds.has(p.authorId)) return false;
      if (p.authorId === user.id) return true;
      if (p.audienceType === "ALL_USERS") return true;
      if (p.audienceType === "CIRCLE") {
        // Membership must predate the edition going live, so joining a
        // circle doesn't grant retroactive access to its whole history.
        // Evaluated per target circle, then unioned.
        return p.postCircles.some((pc) => {
          const joinedAt = circleJoinedMap.get(pc.circleId);
          return joinedAt !== undefined && joinedAt <= (edition.publishedAt ?? p.createdAt);
        });
      }
      if (p.audienceType === "RECIPIENTS") {
        return recipientPostIdSet.has(p.id);
      }
      // FRIENDS: check friendship date against when the edition was published,
      // not when the post was drafted
      const friendshipDate = friendMap.get(p.authorId);
      return (
        friendshipDate !== undefined &&
        friendshipDate <= (edition.publishedAt ?? p.createdAt)
      );
    })
    .map(({ _count, likes, postCircles, ...p }) => {
      // Per-reader visible circle list — never the raw target-circle list,
      // so a reader can't learn the names of circles they aren't in.
      const { circles, hiddenCount } =
        p.audienceType === "CIRCLE"
          ? buildReaderVisibleCircles(
              p.authorId === user.id,
              postCircles.map((pc) => pc.circle),
              new Set(
                postCircles
                  .map((pc) => pc.circleId)
                  .filter((cid) => circleJoinedMap.has(cid)),
              ),
            )
          : { circles: [], hiddenCount: 0 };
      return {
        ...p,
        status: "PUBLISHED" as const, // effective status, see src/lib/reveal.ts
        editionId: edition.id,
        likeCount: _count.likes,
        likedByMe: likes.length > 0,
        circles,
        hiddenCircleCount: hiddenCount,
      };
    });

  // Unread first (so "pick up where you left off" surfaces unread stories
  // immediately), read after — each group keeping its existing recency order.
  const readMap = await getReadMapForPosts(
    user.id,
    visiblePosts.map((p) => p.id),
  );
  const postsWithReadState = visiblePosts.map((p) => ({
    ...p,
    readByMe: readMap.has(p.id),
  }));
  postsWithReadState.sort((a, b) => {
    const aRead = a.readByMe ? 1 : 0;
    const bRead = b.readByMe ? 1 : 0;
    return aRead - bRead;
  });

  // Official posts (Editor's Note / Community Feature) sort last, above the
  // Jam — mirroring the Jam's fixed bottom slot. Stable sort preserves the
  // unread-first ordering within each group.
  postsWithReadState.sort((a, b) => {
    const aOfficial = a.officialKind != null ? 1 : 0;
    const bOfficial = b.officialKind != null ? 1 : 0;
    return aOfficial - bOfficial;
  });

  // View data for reveal overlay
  const [viewRecord, viewerPreview, viewerCount] = await Promise.all([
    prisma.editionView.findUnique({
      where: { editionId_userId: { editionId: id, userId: user.id } },
      select: { openedAt: true },
    }),
    prisma.editionView.findMany({
      where: { editionId: id, userId: { in: validFriendIds } },
      orderBy: { openedAt: "asc" },
      take: 2,
      select: { user: { select: { username: true } } },
    }),
    prisma.editionView.count({
      where: { editionId: id, userId: { in: validFriendIds } },
    }),
  ]);

  const [weeklyJam, jamReadByMe] = await Promise.all([
    getWeeklyJamForEdition(user.id, edition.id, edition.publishedAt),
    hasViewedWeeklyJam(user.id, edition.id),
  ]);

  console.debug(
    "[getPublishedEditionById] edition:",
    edition.id,
    "posts:",
    postsWithReadState.length
  );
  return {
    ...edition,
    posts: postsWithReadState,
    hasOpened: Boolean(viewRecord),
    viewerCount,
    viewerNames: viewerPreview.map((v) => v.user.username),
    weeklyJam: { ...weeklyJam, readByMe: jamReadByMe },
  };
}

export async function getMostRecentPublishedEditionForUser() {
  return prisma.edition.findFirst({
    where: revealedEditionWhere(),
    orderBy: {
      weekStart: "desc",
    },
    select: {
      id: true,
    },
  });
}
