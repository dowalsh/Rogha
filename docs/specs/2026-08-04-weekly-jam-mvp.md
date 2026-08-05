# Spec: Weekly Jam — weekly song card (MVP v1)

Status: **implemented.** Promotes the shipped Last.fm admin spike
([2026-08-01-lastfm-top-track-admin-spike.md](./2026-08-01-lastfm-top-track-admin-spike.md))
from admin-only/env-configured into a real per-user, per-edition feature at the
smallest scope that delivers value. Builds on the "Later, not now" items that
spike deliberately deferred.

## Goal

Every opted-in friend's top track of the week appears as a single card — the
**Weekly Jam** — inside the weekly Edition, autosynced from Last.fm with zero
effort. Nothing to write, nothing to pick.

The value is a **passive-participation floor**: friends who never write a post
still show up in the weekly reveal, which keeps the shared-week feeling alive
and gives lurkers a low-lift reason to keep showing up — without breaking
Rogha's no-infinite-feed, no-algorithm, friends-only ethos (content stays
gated to the Edition and to accepted friends).

## In scope (MVP)

- **Opt-in connect.** A "Connect your Music" flow where a user saves their
  Last.fm username and enables the Jam. Off by default.
- **Weekly capture.** The Sunday cron (`publishEditionForWeek()`) fetches each
  opted-in user's #1 track for the past 7 days and stores one `WeeklyTrack`
  row per user per edition.
- **The Jam card.** One aggregate card per Edition, rendered **below the
  written posts**, per-viewer: shows the viewer's accepted friends (plus the
  viewer) who opted in and have data this week. Each row = track name, artist,
  play count, and an "Open in Spotify" search link.
- **In-card connect CTA.** A "Connect your Music" button at the bottom of the
  Jam, shown **only if the viewer is not connected**. It opens an explainer
  popup (see [Connect flow](#connect-flow--explainer)).
- **Reveal-gated.** The card lives inside the Edition and follows the same
  reveal/visibility behaviour as other edition content.

## Explicitly out (deliberately, for v1)

Veto/override of the auto-pick; manual song choice; multiple tracks per
person; the "one line of why" blurb; comments or reactions on tracks;
head-to-head / brackets / guess-the-friend; collaborative playlist stitching;
streaks; circle-scoped audiences (MVP is friends-only); exact edition-week
alignment (see [Capture](#capture)); backfill.

Album artwork was originally planned as out-of-scope (see
[Compliance](#compliance-gates--decisions-before-ship)) but shipped as part
of MVP once a compliant source existed — see below.

## Data

**`WeeklyTrack`** — new entity. `(editionId, userId)` composite key. Fields:
`name`, `artist`, `playCount` (int), `imageUrl` (nullable), `imageSource`
(nullable, `"spotify" | "lastfm"`), `spotifySearchUrl`, `lastfmUrl`,
`capturedAt`. One row per participating user per edition. Album art is
sourced from Spotify's catalog (`src/lib/spotify.ts`'s
`resolveSpotifyAlbumImage()`, built for the admin spike) with Last.fm's
image as a last-resort fallback — see
[Compliance](#compliance-gates--decisions-before-ship).

`User` gains:

- `lastfmUsername` (string, nullable) — replaces the spike's
  `LASTFM_TEST_USERNAME` env value.
- `jamEnabled` (bool, default `false`) — the opt-in switch.

## Capture

Extend the existing Sunday `publishEditionForWeek()` cron: after publishing,
for each user where `jamEnabled && lastfmUsername`, call the existing
`src/lib/lastfm.ts` helper with `period=7day, limit=1`, normalize, and upsert
a `WeeklyTrack` for that edition. A failure or no-data result for one user
skips that user silently — **never block the edition publish**. Reuse the
spike's parsing rules (track-may-be-a-bare-object, `playcount`-is-a-string,
build the Spotify search URL without calling Spotify's API).

*Week window:* MVP uses `period=7day` (rolling, captured at cron time) — good
enough and needs zero timestamp math. Aligning to the edition's exact window
(`user.getWeeklyTrackChart`) is a known later step, not MVP.

## Display & states

The Jam is a **synthetic aggregate, not a `Post`** — no changes to the Post
model. It queries the viewer's accepted friends' `WeeklyTrack`s for the current
edition and applies the existing friend-visibility rules (accepted friendships
only; reuse the `canViewPostPolicy`-style filtering). It renders below the
edition's written posts.

States:

- **Populated.** One compact row per participating person (viewer included):
  avatar/name, track, artist, play count, "Open in Spotify" link. Plus the
  in-card **"Connect your Music"** button *iff the viewer is not connected*.
- **No friends with data.** The card **still renders** — it is never hidden —
  showing the message **"No friends have connected their Jam yet!"** and the
  **"Connect your Music"** button.
- **Viewer connected but no scrobbles this week.** The viewer's own row is
  simply absent (not an error); the card behaves per the two states above.

Include the "powered by AudioScrobbler" attribution required by the Last.fm
ToS, with correct track deep-links (`last.fm/music/<artist>/_/<track>`).

## Connect flow & explainer

A single **explainer popup** is the shared surface for onboarding into the
feature:

- **Content.** What the Weekly Jam is, that it autosyncs from Last.fm, and how
  to link it — ending with a link/CTA to **Settings**.
- **Entry point 1 — in the Jam card.** The bottom "Connect your Music" button
  opens this popup.
- **Entry point 2 — in Settings.** An **info button beside the Last.fm setting
  reuses the exact same popup copy** (single source of truth — write the copy
  once and share it).
- **Settings input.** A "Connect your Music" section: a text field for the
  Last.fm username and the Jam on/off toggle, with the info button beside it.

## Compliance gates — decisions before ship

Carried forward from the spike's compliance section; these block launch and
are decisions, not code:

1. **Non-commercial licence — still open, not resolved by this build.**
   Confirm Rogha's use qualifies under the Last.fm API ToS, or obtain a
   commercial-use agreement (`partners@last.fm`) first. "No ads" is not by
   itself sufficient. Track *metadata* (name/artist/play count) still comes
   from Last.fm even though art doesn't — this gate isn't sidestepped by the
   art decision below.
2. **Album art — resolved differently than originally planned.** Rather than
   omitting artwork, it's sourced from Spotify's catalog API
   (`resolveSpotifyAlbumImage()`), which sidesteps Last.fm's art-licensing
   exclusion (§5.1.8) specifically — Last.fm's own image is kept only as a
   fallback if Spotify has no match. Spotify's Client Credentials access is
   itself subject to its own 2026 Developer Terms and Dev Mode quota
   changes — see the admin spike doc's compliance notes for what's known
   there.
3. **Attribution.** "Powered by AudioScrobbler" credit shown on the Jam card
   whenever it has rows.

## Config

`LASTFM_API_KEY` stays (server-side only; never reaches the client).
`LASTFM_TEST_USERNAME` is retired — the username now lives on
`User.lastfmUsername`.

## Testing / layers

Web-only: a cron extension, one new entity/migration, a Settings field, an
explainer popup, and a server-rendered card. Nothing touches Capacitor or
native config.

- **Testable in the dev server / browser as-is.**
- **Needs a web deploy** (to wherever `CAP_SERVER_URL`/`server.url` points)
  before it's visible in the native app.
- **No Xcode rebuild** required.

Manual checks: connect a username + enable → play a few tracks → confirm your
row appears after a cron run (or manual trigger); confirm a disabled/
unconnected viewer sees the in-card "Connect your Music" button; confirm the
"No friends have connected their Jam yet!" state renders (card present, button
present); confirm a viewer only sees rows for their own mutual accepted
friends; confirm the API key never appears in the client bundle or any network
response.

## Later, not now

- Auto-pick **veto/override** before the Sunday sweep.
- **Top-N tracks**, a "why" blurb, and **comments/reactions** on tracks (reuse
  the existing Comment / PostLike machinery).
- **Exact edition-week alignment** (`getWeeklyTrackChart`).
- **Circle-scoped** Jams; **profile / friends-list** ambient placement of the
  same `WeeklyTrack`.
- Playful modes (head-to-head, guess-the-friend, streaks) as opt-in events.

## Resolved questions

- **Entity/field naming** — confirmed as proposed: `WeeklyTrack`,
  `User.lastfmUsername`, `User.jamEnabled`.
- **Album art** — included (see [Compliance](#compliance-gates--decisions-before-ship)
  point 2), reversing the original "explicitly out" call.
- **Backfill** — none at launch (matching `PostRead`'s "start empty"
  precedent); the first populated Jam is the first Sunday after ship.
