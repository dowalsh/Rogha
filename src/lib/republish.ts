// src/lib/republish.ts
import { prisma } from "@/lib/prisma";
import { getWeekStartUTC } from "@/lib/utils";

/**
 * One republish send per weekly cycle, counted at confirm time and reset on
 * the same Sunday boundary the edition runs on (see
 * docs/specs/2026-08-13-republish.md). No separate ration table — a
 * republish instance is any Post with republishedFromPostId set, so the cap
 * is just "have I created one of those in the current week window."
 */
export async function hasRepublishRationAvailable(authorId: string): Promise<boolean> {
  const weekStart = getWeekStartUTC();
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const count = await prisma.post.count({
    where: {
      authorId,
      republishedFromPostId: { not: null },
      createdAt: { gte: weekStart, lt: weekEnd },
    },
  });

  return count === 0;
}
