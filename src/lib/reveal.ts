// src/lib/reveal.ts
//
// The weekly reveal is a fixed instant — Sunday 07:00 UTC — and read access
// is derived from it, not from the publish-weekly cron having run. A post is
// assigned its edition at submit time, and that edition's `publishedAt` is
// the scheduled reveal instant (set when the edition is created, never
// "whenever the cron got to it"). From then on:
//
//   - queued: SUBMITTED and its edition hasn't revealed yet (publishedAt > now)
//   - live:   PUBLISHED, or SUBMITTED and its edition has revealed (publishedAt <= now)
//
// The cron still flips SUBMITTED → PUBLISHED afterwards, but only as a
// lagging record (insights, admin) and to trigger emails/notifications —
// nothing should gate visibility on `status === "PUBLISHED"` alone.
//
// Kept free of prisma/server imports so client code and insights can use it.

import type { Prisma } from "@/generated/prisma/client";
import { getWeekStartUTC } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;
const REVEAL_UTC_DAY = 0; // Sunday
const REVEAL_UTC_HOUR = 7;

/** The next Sunday 07:00 UTC strictly after `now`. */
export function nextRevealAt(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setUTCHours(REVEAL_UTC_HOUR, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + ((REVEAL_UTC_DAY - now.getUTCDay() + 7) % 7));
  if (d <= now) d.setUTCDate(d.getUTCDate() + 7);
  return d;
}

/**
 * The reveal instant for the edition keyed by `weekStart` (Monday of its
 * week) — that week's Sunday 07:00 UTC. Computed as "next reveal after
 * weekStart" rather than weekStart + N days so it doesn't depend on the
 * server-TZ quirks of getWeekStartUTC's return value.
 */
export function revealAtForWeekStart(weekStart: Date): Date {
  return nextRevealAt(weekStart);
}

/** The Edition.weekStart key for the edition revealing at `revealAt`. */
export function weekStartForReveal(revealAt: Date): Date {
  // Same "the week that just ended" rule the cron uses (its target is
  // "yesterday" relative to the Sunday-morning run).
  return getWeekStartUTC(new Date(revealAt.getTime() - DAY_MS));
}

/**
 * Whether a post is readable by its audience right now. `editionPublishedAt`
 * is the post's edition.publishedAt (the fixed reveal instant).
 */
export function isPostLive(
  post: { status: string; editionPublishedAt: Date | string | null },
  now: Date = new Date(),
): boolean {
  if (post.status === "PUBLISHED") return true;
  if (post.status !== "SUBMITTED" || post.editionPublishedAt == null) return false;
  return new Date(post.editionPublishedAt).getTime() <= now.getTime();
}

/**
 * The status the author/client should see: a SUBMITTED post whose reveal
 * has passed is PUBLISHED, even if the cron hasn't flipped the row yet.
 */
export function effectivePostStatus<S extends string>(
  status: S,
  editionPublishedAt: Date | string | null,
  now: Date = new Date(),
): S | "PUBLISHED" {
  return isPostLive({ status, editionPublishedAt }, now) ? "PUBLISHED" : status;
}

/** Prisma filter for live posts — combine via `AND`, it uses `OR`. */
export function livePostWhere(now: Date = new Date()): Prisma.PostWhereInput {
  return {
    OR: [
      { status: "PUBLISHED" },
      { status: "SUBMITTED", edition: { publishedAt: { lte: now } } },
    ],
  };
}

/**
 * Prisma filter for queued (submitted, not yet revealed) posts — combine via
 * `AND`, it uses `OR`. `editionId: null` covers posts submitted before
 * submit-time edition assignment existed; the cron attaches those.
 */
export function queuedPostWhere(now: Date = new Date()): Prisma.PostWhereInput {
  return {
    status: "SUBMITTED",
    OR: [{ editionId: null }, { edition: { publishedAt: { gt: now } } }],
  };
}

/**
 * Prisma filter for editions that have revealed and have at least one live
 * post. An edition now exists (with its future publishedAt) from the first
 * submit of its week, so "publishedAt is set" no longer means "revealed";
 * and an edition whose posts were all unsubmitted stays hidden, matching
 * the old cron's no-posts-no-publish rule.
 */
export function revealedEditionWhere(now: Date = new Date()): Prisma.EditionWhereInput {
  return {
    publishedAt: { lte: now },
    posts: { some: { status: { in: ["SUBMITTED", "PUBLISHED"] } } },
  };
}
