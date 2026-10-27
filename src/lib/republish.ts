// src/lib/republish.ts
import { prisma } from "@/lib/prisma";
import { livePostWhere, queuedPostWhere } from "@/lib/reveal";

/**
 * One republish send per weekly cycle (see
 * docs/specs/2026-08-13-republish.md). No calendar-week math and no
 * separate ration table — a republish only ever spends its week while it's
 * queued: the ration is unavailable iff you already have a republish sitting
 * queued, and it frees up the instant its edition reveals on Sunday (or if
 * it's deleted before then). Since a queued post only ever clears at that
 * weekly reveal, this is equivalent to "one per week" without needing to
 * compute or reason about week boundaries at all.
 */
export async function hasRepublishRationAvailable(authorId: string): Promise<boolean> {
  const count = await prisma.post.count({
    where: {
      authorId,
      republishedFromPostId: { not: null },
      AND: [queuedPostWhere()],
    },
  });

  return count === 0;
}

/**
 * Whether this user has ever published a post — i.e. has anything a
 * Republish action could actually target. Used to gate the republish
 * announcement nudge, which is pointless to show someone with nothing
 * publishable yet.
 */
export async function hasPublishedPost(authorId: string): Promise<boolean> {
  const count = await prisma.post.count({
    where: { authorId, AND: [livePostWhere()] },
  });

  return count > 0;
}
