// src/lib/insights/trackingStart.ts
//
// PostRead didn't exist before 20260716140826_add_post_read, and its initial
// seed backfill (20260719061530_backfill_post_reads_as_read, corrected by
// 20260719063000_fix_post_read_backfill_timestamps) inserted a PostRead row
// for every published post x every user at deploy time, all stamped with one
// shared readAt — indistinguishable from a real read except for that shared
// timestamp. Any aggregation touching those rows (wordsRead, funnelRead,
// Roster's reception/consumed counts, last-activity) reads them as genuine
// mass simultaneous activity. Confirmed via:
//   SELECT "readAt", count(*) FROM "PostRead" GROUP BY "readAt" HAVING count(*) > 10;
export const READ_TRACKING_START = new Date("2026-07-19T06:11:12.610Z");

/** PostRead.readAt values known to be bulk-written, not real reads. */
export const POLLUTED_READ_TIMESTAMPS: Date[] = [READ_TRACKING_START];
