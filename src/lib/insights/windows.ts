// src/lib/insights/windows.ts
//
// An edition's "reading window" is the period during which activity counts
// toward it: from its own reveal (publishedAt) until the next edition
// reveals (or now, for the most recent edition). Every insights query that
// buckets activity into an edition uses this window instead of calendar
// weeks, since the audience keeps reading last week's edition right up
// until the next Sunday reveal.

import { prisma } from "@/lib/prisma";

export type EditionWithWindow = {
  id: string;
  title: string | null;
  weekStart: Date;
  publishedAt: Date;
  windowStart: Date;
  windowEnd: Date;
  isSealed: boolean; // true once a later edition has published (its window is closed)
};

/**
 * Every published edition, oldest first, each annotated with its reading
 * window. One query, bounded by edition count (weekly cadence — small even
 * after years of history), not by users/posts/reads.
 */
export async function getAllEditionsWithWindows(): Promise<EditionWithWindow[]> {
  const editions = await prisma.edition.findMany({
    where: { NOT: { publishedAt: null } },
    orderBy: { weekStart: "asc" },
    select: { id: true, title: true, weekStart: true, publishedAt: true },
  });

  return editions.map((ed, i) => {
    const next = editions[i + 1];
    return {
      id: ed.id,
      title: ed.title,
      weekStart: ed.weekStart,
      publishedAt: ed.publishedAt as Date,
      windowStart: ed.publishedAt as Date,
      windowEnd: next?.publishedAt ?? new Date(),
      isSealed: next !== undefined,
    };
  });
}

/** The last `n` published editions (oldest first within the slice). */
export async function getRecentEditionsWithWindows(n: number): Promise<EditionWithWindow[]> {
  const all = await getAllEditionsWithWindows();
  return all.slice(-n);
}

/**
 * The up-to-`n` editions ending at (and including) `editionId`, oldest
 * first — e.g. the trailing-3-edition Active window anchored at a specific
 * (possibly historical) edition rather than "now".
 */
export async function getTrailingWindowsEndingAt(
  editionId: string,
  n: number,
): Promise<EditionWithWindow[]> {
  const all = await getAllEditionsWithWindows();
  const idx = all.findIndex((e) => e.id === editionId);
  if (idx === -1) return [];
  return all.slice(Math.max(0, idx - n + 1), idx + 1);
}

/** The edition immediately before the given one, by weekStart. */
export async function getPreviousEditionId(weekStart: Date): Promise<string | null> {
  const prev = await prisma.edition.findFirst({
    where: { weekStart: { lt: weekStart }, NOT: { publishedAt: null } },
    orderBy: { weekStart: "desc" },
    select: { id: true },
  });
  return prev?.id ?? null;
}
