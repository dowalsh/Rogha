# Spec: Home page (Buzz) redesign

**Status:** implemented.
**Scope:** replaces the flat, per-`ActivityEvent` home feed with a purposeful, per-post home page: an edition hero, a nested "Coming Sunday" teaser, and a de-duplicated Buzz list. Introduces per-post read tracking.

---

## Goal

The signed-in home page orients a returning user and routes them, in as few taps as possible, to the thing they came back for. It answers three questions in priority order: *Is there new stuff to read?* (this week's edition), *What did I miss?* (unread activity on posts I'm part of), and *What's coming?* (posts my friends have submitted for the next reveal).

Page order, top to bottom: **Edition hero** → (inside it) **Coming Sunday** → **New buzz** → **Earlier**.

## 1. Edition hero

A single card at the top, always present, representing the current (latest published) edition. Layout is driven by how much of the edition the user has read; wording is driven by day/freshness — independent axes.

- **State A — Not opened**: accent-bordered card, reveal-moment energy. Copy is day-dependent — release day (Sunday): "This week's edition just dropped"; later in the week: "You haven't opened this week yet." Coming Sunday renders **collapsed** in this state only.
- **State B — Partially read**: neutral card, "Keep reading this week" + "N of M" counter + segmented progress bar + "Finish the N you missed" (links to the edition front page, not directly into a specific post). Coming Sunday renders expanded.
- **State C — Caught up**: quiet card, "You're all caught up this week." No CTA, no countdown — Coming Sunday conveys timing instead.
- **Empty**: no editions published yet → first-run invite to explore/submit, no progress bar, no Coming Sunday at all.

## 2. Coming Sunday (inside the hero)

Appears whenever ≥1 post (including the viewer's own) has been submitted for the next edition; hidden entirely if none. Collapsed to a single "N posts" row only in hero State A; expanded inline everywhere else. Shows one row per submitted post (viewer's own first, if present), with a lock icon and a blurred hero thumbnail — titles are intentionally visible pre-reveal. Footer nudges submission: "Add yours · N days left" + "Start a post" when the viewer hasn't submitted, or "Yours is in · you and N friends so far" when they have.

## 3. Buzz

Everything below the hero — one row per post (not per event), sorted by recency of latest activity:

- **New buzz** — posts with unread activity, newest first. Hidden entirely when empty.
- **Earlier** — posts with no unread activity, newest first, capped at 15 with "Show more."

A post is unread when its latest *comment or reply* is newer than the last time the viewer opened it (or they've never opened it). Likes never count as activity, and newly submitted/published posts don't appear here at all — the hero owns new content, Buzz owns new conversation. A post enters Buzz the moment someone comments on it.

Rows show no actor names and no comment text (that detail lives on the post page) — the row's only job is "is this worth opening?"

## 4. Shared row component

Coming Sunday, New buzz, and Earlier all render the same row (`FeedPostRow`): optional unread dot → thumbnail (blurred for Coming Sunday, clear otherwise, flat neutral fallback tile when there's no hero image) → serif title + `author · meta` line → trailing slot (lock / "N new" badge / chevron).

## Implementation

- **Data**: `src/lib/home.ts` — `getHeroData`, `getComingNext`, `getBuzzPosts`, composed by `getHomeData`, served by `GET /api/home` (`?earlierLimit=` controls the Earlier page size; the client re-fetches with a larger limit on "Show more" rather than a separate cursor-paginated endpoint).
- **Read tracking**: new `PostRead` model (see [data-model.md](../data-model.md)), written via `POST /api/posts/[id]/read` (fired once per mount from `src/app/reader/[id]/page.tsx`, mirroring the existing `EditionView`/reveal-overlay pattern) and read via `src/lib/postReads.ts`.
- **Buzz activity source**: reuses the friend/mutual-friend/temporal-gating logic that powered the old `getBuzz`, but restricts "activity" to `POST_COMMENTED`/`COMMENT_REPLIED` only (submit/publish events belong to the hero, not Buzz — a deliberate narrowing from the old per-event feed, which counted everything but likes).
- **Back navigation**: reuses the existing `?from=` convention on `/reader/[id]` — Buzz rows link with `?from=buzz` (back → home); Frontpage's post links use `?from=edition` (back → the edition front page).
- **Edition post ordering**: `getPublishedEditionById` (`src/lib/editions.ts`) sorts a viewer's edition posts unread-first, then read (each group keeping its existing recency order) — so both the hero's "Finish the N you missed" link (which now lands on the edition front page rather than a specific post) and the front page itself (`Frontpage.tsx`'s lead story slot) naturally surface what the viewer hasn't read yet.
- **Components**: `src/components/home/` — `EditionHero`, `ComingSunday`, `BuzzList`, `FeedPostRow`, `HomeSkeleton`, `HomeContent` (the page's single `useSWR("/api/home?...")` call).
- **Retired**: the old per-`ActivityEvent` feed (`src/components/buzz/*`, `src/lib/buzz.ts`, `GET /api/buzz`) — its actor-avatar/verb/comment-bubble shape didn't fit the new no-actor-names, per-post spec.

## Open follow-up

Release-day copy currently uses a literal calendar-day match (LA time) against the edition's `publishedAt`. This could later become a rolling 24h-since-publish grace window if the literal-calendar-day boundary feels wrong near midnight — flagged in `src/lib/home.ts` (`isReleaseDay`), not yet needed.
