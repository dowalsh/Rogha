// src/lib/republish.ts
import { prisma } from "@/lib/prisma";

/**
 * One republish send per weekly cycle (see
 * docs/specs/2026-08-13-republish.md). No calendar-week math and no
 * separate ration table — a republish only ever spends its week while it's
 * queued: the ration is unavailable iff you already have a republish sitting
 * SUBMITTED, and it frees up the instant the weekly cron promotes that one
 * to PUBLISHED (or if it's deleted before then). Since a submitted post only
 * ever clears via that same weekly cron, this is equivalent to "one per
 * week" without needing to compute or reason about week boundaries at all.
 */
export async function hasRepublishRationAvailable(authorId: string): Promise<boolean> {
  const count = await prisma.post.count({
    where: {
      authorId,
      republishedFromPostId: { not: null },
      status: "SUBMITTED",
    },
  });

  return count === 0;
}
