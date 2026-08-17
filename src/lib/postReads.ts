// src/lib/postReads.ts
import { prisma } from "@/lib/prisma";

export async function markPostRead(userId: string, postId: string): Promise<void> {
  const now = new Date();
  await prisma.postRead.upsert({
    where: { postId_userId: { postId, userId } },
    create: { postId, userId, firstReadAt: now, lastReadAt: now },
    // firstReadAt is deliberately omitted here — never update it after
    // creation, so it stays a permanent record of the first open.
    update: { lastReadAt: now },
  });
}

export async function getReadMapForPosts(
  userId: string,
  postIds: string[],
): Promise<Map<string, Date>> {
  if (!postIds.length) return new Map();

  const rows = await prisma.postRead.findMany({
    where: { userId, postId: { in: postIds } },
    select: { postId: true, lastReadAt: true },
  });

  return new Map(rows.map((r) => [r.postId, r.lastReadAt]));
}
