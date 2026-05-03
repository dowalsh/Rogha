// src/lib/editions.ts
import { prisma } from "@/lib/prisma";
import { getWeekStartUTC, formatWeekLabel } from "@/lib/utils";
import { recordActivityEvent } from "@/actions/activityEvent.action";
import { ActivityEventType } from "@/generated/prisma/enums";
import { getAcceptedFriendships } from "@/lib/friends";

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
          OR: [{ authorId: user.id }, { authorId: { in: friendIds } }],
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          createdAt: true,
          authorId: true,
          author: {
            select: { id: true, name: true, image: true },
          },
        },
      });

      // Temporal gate: only include friend posts created after the friendship started
      const visiblePosts = posts.filter((p) => {
        if (p.authorId === user.id) return true;
        const friendshipDate = friendMap.get(p.authorId);
        return friendshipDate !== undefined && friendshipDate <= p.createdAt;
      });

      console.debug(
        "[getPublishedEditions] edition:",
        ed.id,
        "posts:",
        visiblePosts.length
      );
      return { ...ed, posts: visiblePosts };
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

  // 3) Circles the viewer is part of (for CIRCLE audience)
  const myCircleIds = await prisma.circleMember
    .findMany({
      where: { userId: user.id, status: "JOINED" },
      select: { circleId: true },
    })
    .then((rows) => rows.map((r) => r.circleId));

  // 4) Audience filter
  // - Author can see their own posts
  // - ALL_USERS is open to everyone
  // - FRIENDS requires accepted friendship with author
  // - CIRCLE requires viewer to be JOINED in that circle

  const posts = await prisma.post.findMany({
    where: {
      editionId: edition.id,
      status: "PUBLISHED",
      OR: [
        { authorId: user.id },
        { audienceType: "ALL_USERS" },
        {
          AND: [
            { audienceType: "FRIENDS" },
            { authorId: { in: validFriendIds } },
          ],
        },
        {
          AND: [{ audienceType: "CIRCLE" }, { circleId: { in: myCircleIds } }],
        },
      ],
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
      circle: { select: { id: true, name: true } },
      author: { select: { id: true, name: true, image: true } },
      heroImageUrl: true,
      content: true,
    },
  });

  // Temporal gate: FRIENDS posts are only visible if friendship predates the post
  const visiblePosts = posts.filter((p) => {
    if (p.authorId === user.id) return true;
    if (p.audienceType === "ALL_USERS") return true;
    if (p.audienceType === "CIRCLE") return true; // circle membership already gated by DB query
    // FRIENDS: check friendship date
    const friendshipDate = friendMap.get(p.authorId);
    return friendshipDate !== undefined && friendshipDate <= p.createdAt;
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
      select: { user: { select: { name: true } } },
    }),
    prisma.editionView.count({
      where: { editionId: id, userId: { in: validFriendIds } },
    }),
  ]);

  console.debug(
    "[getPublishedEditionById] edition:",
    edition.id,
    "posts:",
    visiblePosts.length
  );
  return {
    ...edition,
    posts: visiblePosts,
    hasOpened: Boolean(viewRecord),
    viewerCount,
    viewerNames: viewerPreview.map((v) => v.user.name ?? "Someone"),
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
