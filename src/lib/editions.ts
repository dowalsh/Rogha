// src/lib/editions.ts
import { prisma } from "@/lib/prisma";
import { getWeekStartUTC, formatWeekLabel } from "@/lib/utils";
import { recordActivityEvent } from "@/actions/activityEvent.action";
import { ActivityEventType } from "@/generated/prisma/enums";

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
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ aId: user.id }, { bId: user.id }] },
    select: { aId: true, bId: true, status: true, acceptedAt: true },
  });

  const editions = await prisma.edition.findMany({
    where: { NOT: { publishedAt: null } },
    orderBy: { weekStart: "desc" },
    select: { id: true, title: true, weekStart: true, publishedAt: true },
  });

  // return Promise.all(
  //   editions.map(async (ed) => {
  //     const cutoff = ed.publishedAt ?? plannedPublishAt(ed.weekStart);
  //     const validFriendIds = friendships
  //       .filter(
  //         (f) =>
  //           f.status === "ACCEPTED" && f.acceptedAt && f.acceptedAt < cutoff
  //       )
  //       .map((f) => (f.aId === user.id ? f.bId : f.aId));

  //     const posts = await prisma.post.findMany({
  //       where: {
  //         editionId: ed.id,
  //         status: "PUBLISHED",
  //         OR: [{ authorId: user.id }, { authorId: { in: validFriendIds } }],
  //       },
  //       orderBy: { updatedAt: "desc" },
  //       select: {
  //         id: true,
  //         title: true,
  //         status: true,
  //         updatedAt: true,
  //         authorId: true,
  //         author: { select: { id: true, name: true, image: true } },
  //       },
  //     });

  // ABOVE is logic with cutoff; replaced with following logic where all historical posts are readable by new friends

  return Promise.all(
    editions.map(async (ed) => {
      // Friends that are fully accepted, no cutoff check
      const validFriendIds = friendships
        .filter((f) => f.status === "ACCEPTED")
        .map((f) => (f.aId === user.id ? f.bId : f.aId));

      const posts = await prisma.post.findMany({
        where: {
          editionId: ed.id,
          status: "PUBLISHED",
          OR: [{ authorId: user.id }, { authorId: { in: validFriendIds } }],
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          authorId: true,
          author: {
            select: { id: true, name: true, image: true },
          },
        },
      });

      console.debug(
        "[getPublishedEditions] edition:",
        ed.id,
        "posts:",
        posts.length
      );
      return { ...ed, posts };
    })
  );
}

export async function getPublishedEditionById(user: DbUser, id: string) {
  // 1) Friendships for FRIENDS audience
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ aId: user.id }, { bId: user.id }] },
    select: { aId: true, bId: true, status: true },
  });
  const validFriendIds = friendships
    .filter((f) => f.status === "ACCEPTED")
    .map((f) => (f.aId === user.id ? f.bId : f.aId));

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
      authorId: true,
      audienceType: true,
      circleId: true,
      circle: { select: { id: true, name: true } },
      author: { select: { id: true, name: true, image: true } },
      heroImageUrl: true,
      content: true,
    },
  });

  console.debug(
    "[getPublishedEditionById] edition:",
    edition.id,
    "posts:",
    posts.length
  );
  return { ...edition, posts };
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
