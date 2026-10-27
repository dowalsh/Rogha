# Spec: Time-based weekly reveal

Status: **shipped** (staging, 2026-10-20).

## Goal

The weekly reveal should happen at exactly the promised moment — Sunday 07:00 UTC — for
everyone, regardless of whether a background job ran on time. Previously the publish-weekly cron
*was* the reveal: it swept every `SUBMITTED` post into the edition, flipped them to `PUBLISHED`
and stamped `Edition.publishedAt = now()`. A late, failed or manually triggered run moved the
reveal, and with it the temporal gate ("were you friends before it went live?").

## Behaviour

- **One fixed clock.** The reveal instant is the next Sunday 07:00 UTC (`nextRevealAt()`).
- **Edition assigned at submit.** Submitting (or republishing) assigns the post to the edition
  revealing at the next Sunday 07:00 UTC, creating it on first use with `publishedAt` set to that
  instant. Unsubmitting before the reveal clears the assignment. A post submitted one second after
  the reveal belongs to next week's edition — no race with the cron.
- **Live = time check.** A post is live if `PUBLISHED`, or `SUBMITTED` with
  `edition.publishedAt <= now`. Every read path (access policy, edition pages/lists, profile,
  circles, Buzz, share links, republish eligibility) uses `src/lib/reveal.ts`.
- **Editions appear once revealed and non-empty** — `publishedAt <= now` and at least one live
  post, preserving the old "no posts, no edition" rule now that edition rows exist ahead of time.
- **Live posts are locked.** Once revealed, a still-`SUBMITTED` post can't be edited or
  unsubmitted (409). APIs return the *effective* status so the client treats it as published.
- **Cron = side effects only.** It flips due `SUBMITTED` posts to `PUBLISHED` (lagging record for
  insights/admin; catches up across missed runs), records `POST_PUBLISHED` activity, and sends the
  edition email only when it flipped something. Jam capture, thumbnail backfill and the insights
  snapshot are unchanged. A manual admin trigger can no longer reveal early.
- **Sunday live-join** is unchanged in behaviour: `DRAFT → PUBLISHED` into the edition revealed
  that morning.
- **Coming Sunday countdown** counts down to the next reveal: "6 days left" from Monday
  07:00 UTC to "1 day left" on Saturday, and no countdown during the Sunday live-join window.

## Migration / transition

- Data-only migration `20261020120000_time_based_reveal_clear_queued_edition` clears `editionId`
  on any `SUBMITTED` post (stale under the old model, where queued posts carried none) so it can't
  go live instantly.
- Posts queued before deploy have no edition; they show in Coming Sunday as usual and the cron's
  legacy safety net attaches them to the edition it publishes — so for the first Sunday only, they
  go live when the cron runs rather than at exactly 07:00 UTC.

## Known edges

- `Edition.weekStart` still comes from `getWeekStartUTC()`, which depends on the server timezone
  (production is UTC). The reveal instant itself is timezone-independent.
- The reveal is 07:00 UTC year-round, i.e. midnight Pacific in summer and 23:00 Saturday Pacific
  in winter — unchanged from before.
