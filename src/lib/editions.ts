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
