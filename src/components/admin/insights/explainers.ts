// src/components/admin/insights/explainers.ts
//
// Canonical hover-tooltip copy for every metric/term across the Insights
// tab, kept in one place so the same term (e.g. "Active") reads identically
// wherever it shows up — Topline, Funnel, Roster, and the drill-down.
// Wording mirrors docs/specs/2026-08-17-admin-insights-dashboard.md.

export type StatusBand = "ACTIVE" | "SLIPPING" | "DORMANT" | "NEVER_ACTIVATED" | "ONBOARDING";

export const STATUS_EXPLAINERS: Record<StatusBand, string> = {
  ACTIVE: "Did something — read a post, liked, commented, published, or had a Jam track — in any of the last 3 editions.",
  SLIPPING:
    "Was a regular (active in 2 of the last 3 editions), but has now missed the last 2. Still active, trending toward the line — catch them here, before they're gone.",
  DORMANT: "3+ editions in a row with no activity. A post-mortem, not an early warning.",
  NEVER_ACTIVATED:
    "Signed up, but never became active — never crossed into regular activity after their first full edition cycle. A different problem than a regular who left.",
  ONBOARDING: "Joined too recently (within one edition cycle) to judge yet.",
};

export const TOPLINE_EXPLAINERS: Record<
  "users" | "activeUsers" | "posts" | "wordsWritten" | "wordsRead" | "reach",
  string
> = {
  users: "Total signed-up users, with new signups this edition.",
  activeUsers:
    "Users who did something (read a post, liked, commented, published, or had a Jam track) in any of the trailing 3 editions. The single number that most reflects whether Rogha is alive.",
  posts: "Posts published into an edition.",
  wordsWritten: "Total words authored across posts and comments.",
  wordsRead:
    "For every post-read, the word count of that post, summed — depth of consumption, not just reach.",
  reach: "Cumulative users over time — the same total user count, framed as growth.",
};

export const FUNNEL_EXPLAINERS: Record<
  "allUsers" | "active" | "opened" | "read" | "readAll" | "commented" | "wrote",
  string
> = {
  allUsers: "Every signed-up user — the base the whole funnel measures against.",
  active: STATUS_EXPLAINERS.ACTIVE,
  opened: "Of Active users, opened this edition — passed the reveal.",
  read: "Of openers, opened at least one post to read.",
  readAll:
    "Of openers, read every post available to them that week — a completion/depth signal, not just a taste.",
  commented: "Of openers, left at least one comment.",
  wrote: "Of Active users, published a post into this edition — a creation branch off Active, not off openers, since writing doesn't require opening the reveal.",
};

export const RECEPTION_EXPLAINER =
  "Reads + comments their posts have received — did their writing land, or go into silence.";
export const CONSUMED_EXPLAINER =
  "Posts they've read — are they still showing up to read, even if not writing.";
export const ISOLATED_EXPLAINER =
  "Fewer than 3 accepted friends. Below this an edition tends to feel empty and the account tends to die — the most common dead-account cause.";
