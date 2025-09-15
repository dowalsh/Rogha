import { prisma } from "@/lib/prisma";
type DbUser = { id: string }; // ✅ minimal shape

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
      console.debug("[publishEditionForWeek] No edition found for weekStart");
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

// src/lib/editions.ts
export function plannedPublishAt(weekStart: Date): Date {
  // simplest: weekStart + 7 days at 07:00 (UTC or your canonical TZ already normalized)
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + 7);
  d.setUTCHours(7, 0, 0, 0);
  console.debug(
    "[plannedPublishAt] weekStart:",
    weekStart,
    "plannedPublishAt:",
    d
  );
  return d;
}

export async function getFilteredEditions(user: DbUser) {
  console.debug("[getFilteredEditions] user:", user);
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ aId: user.id }, { bId: user.id }] },
    select: { aId: true, bId: true, status: true, acceptedAt: true },
  });
  console.debug("[getFilteredEditions] friendships:", friendships);

  const editions = await prisma.edition.findMany({
    where: { NOT: { publishedAt: null } },
    orderBy: { weekStart: "desc" },
    select: {
      id: true,
      title: true,
      weekStart: true,
      publishedAt: true,
      posts: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          authorId: true,
          author: { select: { id: true, name: true, image: true } },
        },
      },
      _count: {
        select: {
          posts: {
            where: {
              status: "PUBLISHED",
            },
          },
        },
      },
    },
  });
  console.debug("[getFilteredEditions] editions:", editions);

  return editions.map((ed) => {
    const cutoff = ed.publishedAt ?? plannedPublishAt(ed.weekStart);
    const validFriendIds = new Set(
      friendships
        .filter(
          (f) =>
            f.status === "ACCEPTED" &&
            f.acceptedAt !== null &&
            f.acceptedAt < cutoff
        )
        .map((f) => (f.aId === user.id ? f.bId : f.aId))
    );
    console.debug(
      "[getFilteredEditions] edition:",
      ed.id,
      "cutoff:",
      cutoff,
      "validFriendIds:",
      validFriendIds
    );

    const posts = ed.posts.filter((p) => {
      if (p.authorId === user.id) return true;
      if (p.status !== "PUBLISHED") return false;
      return validFriendIds.has(p.authorId);
    });
    console.debug(
      "[getFilteredEditions] edition:",
      ed.id,
      "filtered posts:",
      posts
    );

    return { ...ed, posts, count: posts.length };
  });
}

export async function getFilteredEditionById(user: DbUser, id: string) {
  console.debug("[getFilteredEditionById] user:", user, "id:", id);
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ aId: user.id }, { bId: user.id }] },
    select: { aId: true, bId: true, status: true, acceptedAt: true },
  });
  console.debug("[getFilteredEditionById] friendships:", friendships);

  const edition = await prisma.edition.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      weekStart: true,
      publishedAt: true,
      posts: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          authorId: true,
          author: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });
  console.debug("[getFilteredEditionById] edition:", edition);

  if (!edition) {
    console.debug("[getFilteredEditionById] No edition found for id:", id);
    return null;
  }
  const cutoff = edition.publishedAt ?? plannedPublishAt(edition.weekStart);
  const validFriendIds = new Set(
    friendships
      .filter((f) => {
        const acceptedAt = f.acceptedAt;
        const isAccepted = f.status === "ACCEPTED" && acceptedAt !== null;
        if (isAccepted) {
          console.debug(
            "[getFilteredEditionById] acceptedAt:",
            acceptedAt,
            "cutoff:",
            cutoff,
            "acceptedAt < cutoff:",
            acceptedAt! < cutoff
          );
        }
        return isAccepted && acceptedAt! < cutoff;
      })
      .map((f) => (f.aId === user.id ? f.bId : f.aId))
  );
  console.debug(
    "[getFilteredEditionById] cutoff:",
    cutoff,
    "validFriendIds:",
    validFriendIds
  );

  const posts = edition.posts.filter((p) => {
    if (p.authorId === user.id) return true;
    if (p.status !== "PUBLISHED") return false;
    return validFriendIds.has(p.authorId);
  });
  console.debug("[getFilteredEditionById] filtered posts:", posts);

  return { ...edition, posts, count: posts.length };
}
