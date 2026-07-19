// src/lib/postReads.ts
import { prisma } from "@/lib/prisma";

export async function markPostRead(userId: string, postId: string): Promise<void> {
  await prisma.postRead.upsert({
    where: { postId_userId: { postId, userId } },
    create: { postId, userId },
    update: {},
  });
}

export async function getReadMapForPosts(
  userId: string,
  postIds: string[],
): Promise<Map<string, Date>> {
  if (!postIds.length) return new Map();

  const rows = await prisma.postRead.findMany({
    where: { userId, postId: { in: postIds } },
    select: { postId: true, readAt: true },
  });

  return new Map(rows.map((r) => [r.postId, r.readAt]));
}
