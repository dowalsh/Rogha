// src/lib/insights/trackingStart.ts
//
// PostRead didn't exist before 20260716140826_add_post_read, and its initial
// seed backfill (20260719061530_backfill_post_reads_as_read, corrected by
// 20260719063000_fix_post_read_backfill_timestamps) inserted a PostRead row
// for every published post x every user at deploy time, all stamped with one
// shared readAt — indistinguishable from a real read except for that shared
// timestamp. 20260817060000_split_post_read_first_last later split readAt
// into firstReadAt (immutable, set once — drives read-count/window
// analytics) and lastReadAt (updated on every reopen — drives last-activity/
// unread-badge logic). The backfill copied readAt verbatim into both new
// columns, so every polluted row's firstReadAt and lastReadAt still carry
// the original shared bulk-write timestamp — this exclusion list applies
// unchanged to whichever column a given query filters on. Any aggregation
// touching these rows (wordsRead, funnelRead, Roster's reception/consumed
// counts, last-activity) would otherwise read them as genuine mass
// simultaneous activity. Confirmed via:
//   SELECT "lastReadAt", count(*) FROM "PostRead" GROUP BY "lastReadAt" HAVING count(*) > 10;
export const READ_TRACKING_START = new Date("2026-07-19T06:11:12.610Z");

/** PostRead.firstReadAt / lastReadAt values known to be bulk-written, not real reads. */
export const POLLUTED_READ_TIMESTAMPS: Date[] = [READ_TRACKING_START];
