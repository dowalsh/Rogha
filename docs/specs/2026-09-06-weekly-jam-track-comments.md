# Spec: per-song comment threads on the Weekly Jam

Status: **implemented.** Fills in the "comments/reactions on tracks" item the
Weekly Jam MVP spec ([2026-08-04-weekly-jam-mvp.md](./2026-08-04-weekly-jam-mvp.md))
deliberately deferred, by extending the existing `Comment` model rather than
building a parallel system.

## Goal

Let people comment on an individual song row in the Weekly Jam
(`/editions/[id]/jam`), so reactions to "what someone's been listening to"
have a home instead of spilling into unrelated post comments or DMs.

## Data model

`Comment.postId` is now nullable, and a nullable `Comment.weeklyTrackId` was
added alongside it — a comment attaches to exactly one of a `Post` or a
`WeeklyTrack` (enforced in the API, not a DB constraint, matching how the
rest of this codebase handles either/or shapes). `WeeklyTrack` gained a
scalar `id` (it previously had only a composite `(editionId, userId)` primary
key) so `Comment` has a single FK column to point at; `(editionId, userId)`
uniqueness moved to a unique index instead of the primary key.

`CommentLike`, notifications, and moderation all key off `commentId`, not
`postId`, so they work unchanged for track comments — no parallel "TrackLike"
or "TrackComment" model was needed.

## Nesting

Top-level only — no replies at all, unlike posts (which allow one level of
nesting via `parentCommentId`). `src/app/api/tracks/[id]/comments/route.ts`
rejects any `parentId` on POST with a 400, and `CommentsSection`/`CommentItem`
hide the Reply button and reply composer entirely when the thread's `target`
is a track. Visually, the composer + top-level comments are grouped under a
single vertical line beneath the song row (mirroring how a post comment's
replies are grouped under it), since there's no per-comment reply thread to
group instead.

## Audience

Same rule as who can see the row in the Jam at all: the track owner, plus
their accepted friends whose friendship predates the edition's publish date
(mirrors the temporal gate FRIENDS-audience posts use), minus anyone
blocked. See `src/lib/access/trackAccess.ts` (`requireTrackAccess`), which
re-derives the same candidate logic `getWeeklyJamForEdition`
(`src/lib/jam.ts`) uses to build the rows a viewer sees.

## UI

Inline, expandable per song row on the dedicated Jam page only — not on the
Frontpage/Editions-listing/Coming-Sunday previews, which only ever show a
compact teaser. Each row shows a comment-count badge at all times; tapping it
expands a full thread (`CommentsSection`, generalized to accept a `target:
{ kind: "post" | "track"; id }` instead of being post-only) directly below
the row. Rows expand/collapse independently — no accordion, so more than one
thread can be open at once. A collapsed row's thread is not fetched until
expanded.

## Notifications

Reuses `createCommentNotification`, extended with a `trackId` branch
alongside the existing `postId` one — the track's owner gets notified the
same way a post author does, deep-linking to `/editions/[id]/jam#comment-…`
instead of the reader. Reply notifications (which notify the whole thread's
other participants) already routed through comment/parent lookups rather
than a hardcoded post path, so they needed only a small generalization
(`resolveCommentTargetPath`) to resolve the right target page for either
kind of thread.

## Moderation

Track comments show up in the existing `/api/admin/comments` /
`/admin/comments` tooling — the admin comment list now shows the track name
and artist (linking to the Jam page) in place of a post title when a comment
has no post.

## Deliberately out of scope

- **Activity feed / insights.** `ActivityEvent.postId` is required and powers
  post-centric insights aggregation; track comments don't feed it (same as
  they don't feed post-comment `recordActivityEvent` calls). Extending
  activity/insights to tracks would be a separate, larger change.
- **Admin report moderation for tracks.** Reported track comments still show
  up in `/api/admin/reports`, but without a clickable "view in context" link
  (that already degraded gracefully to no-link for anything without a
  `postId`, before this change) — a dedicated admin track view wasn't built.

## Related: exact-match "Open in Spotify" links

Alongside per-song threads, `WeeklyTrack` gained a `spotifyTrackUrl` field:
the Spotify search call already made to resolve album art
(`resolveSpotifyTrackMatch` in `src/lib/spotify.ts`, replacing the
image-only `resolveSpotifyAlbumImage` for this call site) now also returns
the matched track's own `open.spotify.com/track/<id>` URL. "Open in Spotify"
prefers this exact link when a match was found, falling back to the
original `spotifySearchUrl` (a search-results link) when Spotify's search
didn't find a confident match.
