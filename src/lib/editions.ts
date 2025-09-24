// src/lib/editions.ts
import { prisma } from "@/lib/prisma";
type DbUser = { id: string };

export function plannedPublishAt(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + 7);
  d.setUTCHours(7, 0, 0, 0);
  console.debug("[plannedPublishAt]", { weekStart, planned: d });
  return d;
}

/**
 * Publishes the edition for the given weekStart (LA Monday 00:00 stored in UTC).
 * Idempotent for the "publishedAt" stamp. Subsequent runs will still promote any
 * newly SUBMITTED posts to PUBLISHED.
 */
export async function publishEditionForWeek(weekStart: Date) {
  console.debug("[publishEditionForWeek] weekStart:", weekStart);
  return prisma.$transaction(async (tx) => {
    const edition = await tx.edition.findUnique({
      where: { weekStart },
      select: { id: true, publishedAt: true },
    });
    console.debug("[publishEditionForWeek] edition:", edition);

    // No edition for that week → nothing to do
    if (!edition) {
      console.debug(
        "[publishEditionForWeek] No edition found for weekStart: ",
        weekStart
      );
      return {
        ok: true,
        published: false,
        reason: "NO_EDITION" as const,
        postsPublished: 0,
      };
    }

    // If already published: still promote any SUBMITTED posts now
    if (edition.publishedAt) {
      console.debug(
        "[publishEditionForWeek] Edition already published at",
        edition.publishedAt
      );
      const { count: promotedNow } = await tx.post.updateMany({
        where: { editionId: edition.id, status: "SUBMITTED" },
        data: { status: "PUBLISHED" },
      });
      console.debug(
        "[publishEditionForWeek] Promoted SUBMITTED posts to PUBLISHED:",
        promotedNow
      );

      return {
        ok: true,
        published: false,
        reason: "ALREADY_PUBLISHED" as const,
        editionId: edition.id,
        postsPublished: promotedNow,
      };
    }

    // First-time publish: stamp publishedAt, publish SUBMITTED, archive remaining DRAFT
    await tx.edition.update({
      where: { id: edition.id },
      data: { publishedAt: new Date() },
    });
    console.debug(
      "[publishEditionForWeek] Stamped publishedAt for edition",
      edition.id
    );

    const { count: publishedCount } = await tx.post.updateMany({
      where: { editionId: edition.id, status: "SUBMITTED" },
      data: { status: "PUBLISHED" },
    });
    console.debug(
      "[publishEditionForWeek] Published SUBMITTED posts:",
      publishedCount
    );

    await tx.post.updateMany({
      where: { editionId: edition.id, status: "DRAFT" },
      data: { status: "ARCHIVED" },
    });
    console.debug(
      "[publishEditionForWeek] Archived DRAFT posts for edition",
      edition.id
    );

    return {
      ok: true,
      published: true,
      editionId: edition.id,
      postsPublished: publishedCount,
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
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ aId: user.id }, { bId: user.id }] },
    select: { aId: true, bId: true, status: true, acceptedAt: true },
  });

  const edition = await prisma.edition.findUnique({
    where: { id },
    select: { id: true, title: true, weekStart: true, publishedAt: true },
  });

  if (!edition) return null;

  const cutoff = edition.publishedAt ?? plannedPublishAt(edition.weekStart);
  // const validFriendIds = friendships
  //   .filter(
  //     (f) => f.status === "ACCEPTED" && f.acceptedAt && f.acceptedAt < cutoff
  //   )
  //   .map((f) => (f.aId === user.id ? f.bId : f.aId));
  // Friends that are fully accepted, no cutoff check
  const validFriendIds = friendships
    .filter((f) => f.status === "ACCEPTED")
    .map((f) => (f.aId === user.id ? f.bId : f.aId));

  const posts = await prisma.post.findMany({
    where: {
      editionId: edition.id,
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
      author: { select: { id: true, name: true, image: true } },
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
