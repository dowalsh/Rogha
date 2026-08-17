// src/lib/insights/status.ts
//
// Status-band computation per docs/specs/2026-08-17-admin-insights-dashboard.md
// ("Status bands"). Bounded by user count + a handful of range queries — safe
// to run live for the Roster.

import { getActivityInRange } from "./activity";
import { getRecentEditionsWithWindows, type EditionWithWindow } from "./windows";

export type StatusBand = "ACTIVE" | "SLIPPING" | "DORMANT" | "NEVER_ACTIVATED" | "ONBOARDING";

const ONE_EDITION_CYCLE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Pure decision function. `editionFlags` is "did this user do something in
 * edition E" ordered oldest → newest, covering up to the last 5 editions
 * (E-4..E0) so "Regular" (2-of-3) can be evaluated in the window immediately
 * before the trailing-3 "Active" window, per spec.
 *
 * "ONBOARDING" isn't one of the spec's four displayed statuses — it's the
 * tenure-aware placeholder for a user who joined too recently to be judged
 * Dormant/Never-activated yet (spec: "a user who joined this week is never
 * Dormant or Never-activated yet").
 */
export function computeUserStatus(args: {
  editionFlags: boolean[]; // oldest → newest, up to 5 entries
  joinedAt: Date;
  lastActiveAt: Date | null;
  now?: Date;
}): StatusBand {
  const { editionFlags, joinedAt, lastActiveAt, now = new Date() } = args;

  const last3 = editionFlags.slice(-3);
  const last2 = editionFlags.slice(-2);
  const regularWindow = editionFlags.slice(-5, -2);

  const active = last3.some(Boolean);
  const missedLast2 = last2.length > 0 && last2.every((v) => !v);
  const wasRegular = regularWindow.length >= 3 && regularWindow.filter(Boolean).length >= 2;

  if (active) {
    if (missedLast2 && wasRegular) return "SLIPPING";
    return "ACTIVE";
  }

  const hasEnoughTenure = now.getTime() - joinedAt.getTime() >= ONE_EDITION_CYCLE_MS;
  if (!hasEnoughTenure) return "ONBOARDING";
  return lastActiveAt ? "DORMANT" : "NEVER_ACTIVATED";
}

export type UserStatusRow = { status: StatusBand; lastActiveAt: Date | null };

/**
 * Active user ids as of a specific edition (the trailing-3-edition window
 * ending at `editions[editions.length - 1]`). Used both by the live Roster
 * (anchored at "now") and by historical snapshot computation (anchored at a
 * sealed edition) — same primitive, different anchor.
 */
export async function getActiveUserIdsAsOf(
  trailingEditions: EditionWithWindow[],
): Promise<Set<string>> {
  const windows = trailingEditions.slice(-3);
  const sets = await Promise.all(
    windows.map((w) => getActivityInRange(w.windowStart, w.windowEnd)),
  );
  const active = new Set<string>();
  for (const s of sets) for (const id of Array.from(s)) active.add(id);
  return active;
}

/**
 * Full status band (and last-active timestamp) for every user, anchored at
 * "now" — i.e. the trailing window ends at the most recent published
 * edition's open (unsealed) window. For the Roster.
 */
export async function getAllUserStatuses(
  users: { id: string; createdAt: Date }[],
  lastActivityMap: Map<string, Date>,
): Promise<Map<string, UserStatusRow>> {
  const editions = await getRecentEditionsWithWindows(5);
  const activitySets = await Promise.all(
    editions.map((w) => getActivityInRange(w.windowStart, w.windowEnd)),
  );

  const result = new Map<string, UserStatusRow>();
  for (const user of users) {
    const editionFlags = activitySets.map((s) => s.has(user.id));
    const lastActiveAt = lastActivityMap.get(user.id) ?? null;
    const status = computeUserStatus({ editionFlags, joinedAt: user.createdAt, lastActiveAt });
    result.set(user.id, { status, lastActiveAt });
  }
  return result;
}
