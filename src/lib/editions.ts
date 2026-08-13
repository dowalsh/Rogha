// src/lib/editions.ts
import { prisma } from "@/lib/prisma";
import { getWeekStartUTC, formatWeekLabel } from "@/lib/utils";
import { recordActivityEvent } from "@/actions/activityEvent.action";
import { ActivityEventType } from "@/generated/prisma/enums";
import { getAcceptedFriendships } from "@/lib/friends";
import { getReadMapForPosts } from "@/lib/postReads";
import { buildAudienceCandidateWhere, getRecipientPostIds } from "@/lib/access/postAccess";
import { getWeeklyJamForEdition } from "@/lib/jam";

type DbUser = { id: string };

export function plannedPublishAt(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + 7);
  d.setUTCHours(7, 0, 0, 0);
  console.debug("[plannedPublishAt]", { weekStart, planned: d });
  return d;
}

/**
 * Publishes the edition for the given weekStart.
 *
 * New model:
 *  - Posts do NOT carry editionId until PUBLISHED.
 *  - When publishing a week:
 *      1. Upsert edition for that week.
 *      2. Find *all* SUBMITTED posts (no date filter).
 *      3. Force-assign them to this edition and mark them PUBLISHED.
 *      4. If this is the first publish, stamp publishedAt.
 *      5. If already published, still promote new SUBMITTED posts.
 *
 * NOTE: Because cron only calls this for the *most recent week*,
 *       this effectively means: "every SUBMITTED post is included
 *       in the next edition".
 */
export async function publishEditionForWeek(weekStart: Date) {
  console.debug("[publishEditionForWeek] weekStart:", weekStart);

  return prisma.$transaction(async (tx) => {
    // 1. Upsert edition (always exists in new model)
    const edition = await tx.edition.upsert({
      where: { weekStart },
      update: {},
      create: {
        weekStart,
        title: `Week of ${formatWeekLabel(weekStart)}`,
      },
      select: { id: true, publishedAt: true },
    });

    console.debug("[publishEditionForWeek] edition:", edition);

    // 2. Find *all* submitted posts (no date filtering)
    const submittedPosts = await tx.post.findMany({
      where: { status: "SUBMITTED" },
      select: { id: true, authorId: true },
    });

    console.debug(
      "[publishEditionForWeek] submitted posts found:",
      submittedPosts.map((p) => p.id)
    );

    if (submittedPosts.length === 0) {
      return {
        ok: true,
        published: false,
        reason: "NO_SUBMITTED_POSTS",
        editionId: edition.id,
        postsPublished: 0,
      };
    }

    // 3. Promote them + overwrite stale editionId
    const { count: promotedCount } = await tx.post.updateMany({
      where: {
        id: { in: submittedPosts.map((p) => p.id) },
      },
      data: {
        status: "PUBLISHED",
        editionId: edition.id,
      },
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

    // 4. Stamp publishedAt if first time publishing
    let becamePublishedNow = false;

    if (!edition.publishedAt) {
      await tx.edition.update({
        where: { id: edition.id },
        data: { publishedAt: new Date() },
      });
      becamePublishedNow = true;

      console.debug(
        "[publishEditionForWeek] stamped publishedAt for edition",
        edition.id
      );
    }

    return {
      ok: true,
      published: becamePublishedNow,
      reason: becamePublishedNow ? "FIRST_PUBLISH" : "ALREADY_PUBLISHED",
      editionId: edition.id,
      postsPublished: promotedCount,
    };
  });
}

export async function getPublishedEditions(user: DbUser) {
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
    where: { NOT: { publishedAt: null } },
    orderBy: { weekStart: "desc" },
    select: { id: true, title: true, weekStart: true, publishedAt: true },
  });

  return Promise.all(
    editions.map(async (ed) => {
      const posts = await prisma.post.findMany({
        where: {
          editionId: ed.id,
          status: "PUBLISHED",
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
          circleId: true,
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
          const joinedAt = p.circleId ? circleJoinedMap.get(p.circleId) : undefined;
          return joinedAt !== undefined && joinedAt <= (ed.publishedAt ?? p.createdAt);
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
      const weeklyJam = {
        hasData: jamTracks.length > 0,
        ownImageUrl: jamTracks.find((t) => t.userId === user.id)?.imageUrl ?? null,
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
      return { ...ed, posts: orderedPosts, weeklyJam };
    })
  );
}

export async function getPublishedEditionById(user: DbUser, id: string) {
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
      status: "PUBLISHED",
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
      circleId: true,
      officialKind: true,
      circle: { select: { id: true, name: true } },
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
        const joinedAt = p.circleId ? circleJoinedMap.get(p.circleId) : undefined;
        return joinedAt !== undefined && joinedAt <= (edition.publishedAt ?? p.createdAt);
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
    .map(({ _count, likes, ...p }) => ({
      ...p,
      editionId: edition.id,
      likeCount: _count.likes,
      likedByMe: likes.length > 0,
    }));

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

  const weeklyJam = await getWeeklyJamForEdition(user.id, edition.id);

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
    weeklyJam,
  };
}

export async function getMostRecentPublishedEditionForUser() {
  return prisma.edition.findFirst({
    where: {
      publishedAt: { not: null },
    },
    orderBy: {
      weekStart: "desc",
    },
    select: {
      id: true,
    },
  });
}
