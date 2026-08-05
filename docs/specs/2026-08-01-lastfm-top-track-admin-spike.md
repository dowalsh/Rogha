# Spec: Last.fm top-track admin spike (v1.0)

Status: **design — not yet built.** This is a deliberately tiny first slice:
prove Rogha can read a user's top track of the week from Last.fm, behind a
single admin-only button. No Editions integration, no cron, no schema
changes. Everything about how this becomes a real per-user weekly feature is
explicitly out of scope — see [Later, not now](#later-not-now).

## Goal

Answer one question with running code: **can we pull "my top track of the
last week" reliably?** A button on the admin dashboard calls Last.fm for
Dylan's own account and renders the result. This validates the end-to-end
setup (Spotify → Last.fm scrobbling, Last.fm API key, the read call, parsing)
before any of it gets wired into the weekly product.

Because Dylan is the only admin, "just me" is a feature, not a limitation:
the admin gate is the whole access model for v1, and the Last.fm username can
be a single env value rather than per-user data.

## Why Last.fm and not Spotify directly

Spotify's Web API can't serve this. Its shortest "top items" window is ~4
weeks (no weekly option), and — since the Feb 2026 changes — development-mode
apps are capped at 5 users while extended quota now requires a registered
business with 250k+ MAU. That's incompatible with a small friends-only app.

Last.fm sidesteps all of it. Spotify scrobbles every play to Last.fm
automatically; Rogha only ever *reads* Last.fm, which needs nothing but an
API key and a username (no per-user OAuth, no quota review). Spotify never
talks to Rogha. See the earlier exploration notes for the full reasoning.

## Setup steps

### What Last.fm actually is (read this first if you're unfamiliar)

[Last.fm](https://www.last.fm) is an old (2002!) music website that does one
thing relevant here: it keeps a public log of what you listen to, called
**"scrobbling."** You connect a music player you already use — Spotify,
Apple Music, whatever — to your Last.fm account once, and from then on every
song you play gets silently reported to Last.fm and added to your listening
history. That history is readable through Last.fm's own free, public API:
give it a username, and it'll tell you what someone's top tracks were over
some time window.

That's the entire reason Rogha uses it. **Spotify's own API can't answer
"what was my top track this week"** — it has no weekly window, and (see
[Why Last.fm and not Spotify directly](#why-last.fm-and-not-spotify-directly)
above) Spotify's 2026 developer-access rules make calling it for this kind of
per-user data impractical for a small app anyway. Last.fm sidesteps both
problems: Spotify already scrobbles to it automatically, so Rogha only has to
*read* Last.fm's API — no login, no per-user permission screen, nothing to
build on Spotify's side at all.

**Two separate identities are involved, don't mix them up:**
- **Your Last.fm *account*** — created once, holds your listening history.
  This is what supplies the **username** each connected person needs (see
  below).
- **A Last.fm *API key*** — a separate, one-time credential that lets
  Rogha's server *read* Last.fm's data at all. This is not a personal
  account and isn't tied to any one listener; it's configured once as
  `LASTFM_API_KEY` and shared by every user's reads.

### One-time setup (whoever is standing up the feature — an env var, done once)

1. **Create a Last.fm account**, if you don't have one already:
   <https://www.last.fm/join>.
2. **Create a Last.fm API key.** Go to
   <https://www.last.fm/api/account/create> and fill in the short form (app
   name/description can be anything — this isn't reviewed or public-facing).
   You'll immediately get an **API key** (a long string of letters/numbers)
   and a "shared secret" — ignore the secret, it's only needed for *writing*
   to Last.fm, and this feature only ever reads. Put the API key in
   `.env`/`.env.local` and Vercel as `LASTFM_API_KEY` — this is the one
   value that needs real infrastructure setup; everything below is
   per-listener and doesn't touch env vars or code.

### Per-listener setup (anyone who wants their music to show up — no env vars, no code)

Each person doing this needs their own Last.fm account (step 1 above, if they
don't have one) plus:

1. **Connect your music player to Last.fm ("scrobbling").** Go to
   <https://www.last.fm/settings/applications> and connect Spotify (or
   whichever service you use — Last.fm supports most). Once connected, every
   track you play from then on gets logged automatically, on any device, with
   no further action. **Only new listens scrobble** — there's nothing to
   "backfill" or import from before you connected.
2. **Make sure your listening history is publicly readable.** In
   <https://www.last.fm/settings/privacy>, confirm "Hide recent listening
   information" is **off**. The API can only ever see *public* listening
   data — if this is on, reads come back empty even though scrobbling is
   working.
3. **Play some music.** Scrobbles land within seconds of a track finishing,
   but play a handful of songs so there's a clear "top track," not a
   three-way tie from one listen each.
4. **Find your username** — it's in your profile URL, `last.fm/user/<username>`.
   For the admin spike, hand this to whoever configured `LASTFM_API_KEY`
   (see [Config](#config)); for the real Weekly Jam feature, enter it
   directly in **Settings → Connect your Music** — no env var, no deploy.

### Sanity check

You can confirm the whole pipeline works, before touching any Rogha code or
UI, by pasting this into a browser with your own two values filled in:

```
https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=YOUR_USERNAME&period=7day&limit=1&api_key=YOUR_API_KEY&format=json
```

If that returns a track (JSON with a `toptracks.track` entry), everything is
wired correctly — scrobbling, privacy, and the API key are all working — and
the button/card in Rogha is just a wrapper around this exact call.

## Scope

In:

- A button on the admin dashboard: **"Fetch my top track (last 7 days)."**
- A server-side admin-only endpoint that calls Last.fm and returns the top
  track for the configured username.
- Rendering the result inline: track name, artist, play count, album art,
  and an "open in Spotify" link. Errors and the no-data case shown plainly.

Out (v1 does none of this): storing the result, any `User`/`Post`/`Edition`
schema change, cron, per-user Last.fm accounts, aligning to a calendar/edition
week, showing anyone else's data.

## The Last.fm call

One method, no auth beyond the API key:

- **Method:** `user.getTopTracks`
  ([docs](https://www.last.fm/api/show/user.getTopTracks))
- **Endpoint:** `GET https://ws.audioscrobbler.com/2.0/`
- **Params:** `method=user.gettoptracks`, `user=<username>`,
  `period=7day`, `limit=1`, `api_key=<key>`, `format=json`
- **Auth:** none required.

`period=7day` is a **rolling last-7-days** window, not a calendar week. For
v1 ("my top track from the last week") that's exactly right and needs zero
timestamp math. When this later has to line up with a specific Edition week,
that's the moment to switch to `user.getWeeklyTrackChart` or
`user.getRecentTracks` with explicit `from`/`to` — noted in
[Later, not now](#later-not-now), not built now.

### Parsing the response

Shape (JSON, `limit=1`):

```json
{
  "toptracks": {
    "track": [
      {
        "name": "Track name",
        "playcount": "14",
        "url": "https://www.last.fm/music/Artist/_/Track+name",
        "mbid": "",
        "artist": { "name": "Artist name", "mbid": "...", "url": "..." },
        "image": [
          { "size": "small", "#text": "..." },
          { "size": "medium", "#text": "..." },
          { "size": "large", "#text": "..." },
          { "size": "extralarge", "#text": "..." }
        ]
      }
    ],
    "@attr": { "user": "...", "total": "..." }
  }
}
```

Parsing notes the agent should handle:

- **`track` may be an object, not an array.** Last.fm returns a bare object
  (not a one-element array) in some single-result cases. Normalize with
  `Array.isArray(track) ? track[0] : track`.
- **`playcount` is a string** — coerce to number.
- **Album art:** pick the largest non-empty `#text` (prefer `extralarge` →
  `large`). `#text` is frequently an empty string; fall back to no image.
  v1 (admin-only) can show it, but Last.fm artwork is **not licensed** for the
  public feature — see [Compliance](#compliance-lastfm-api-tos).
- **Spotify link without Spotify's API:** don't call Spotify to resolve it.
  Build a search deep link — `https://open.spotify.com/search/<encoded
  "Artist Track">` — or use `https://song.link/`. Keep v1 to the plain search
  URL; it needs no dependency.

### Errors and edge cases

- **Last.fm error envelope:** failures return `{ "error": <code>, "message":
  "..." }` with HTTP 200. Check for `error` before reading `toptracks`. Key
  codes: `10` invalid API key, `29` rate limit, `6` missing param, `17`
  user has restricted access / private profile.
- **No scrobbles in the window:** `toptracks.track` is empty (or absent).
  Show "No listening data in the last 7 days," not an error.
- **Private profile:** surfaces as an error/empty result — the fix is the
  privacy setting in [Setup](#setup-steps-for-dylan-do-these-first), so the
  UI copy should hint at that.
- **Network/timeout:** show a generic failure with a retry; never leak the
  API key into any client-visible error.

## Implementation shape

Match existing admin patterns rather than inventing new ones.

- **Endpoint:** `src/app/api/admin/lastfm-top-track/route.ts`, a `GET` that
  starts with `export const runtime = "nodejs"` and gates on
  `requireAdmin()` from `@/lib/admin` (same as
  `src/app/api/admin/reports/route.ts`). It reads config from env, calls
  Last.fm server-side (so the API key never reaches the client), parses, and
  returns a small normalized JSON object:

  ```ts
  // 200 success
  { track: { name, artist, playCount, imageUrl, lastfmUrl, spotifySearchUrl } }
  // 200 no-data
  { track: null }
  // non-2xx
  { error: "LASTFM_ERROR" | "NOT_CONFIGURED" | "FORBIDDEN" }
  ```

- **UI:** a button + result card in
  `src/app/admin/AdminDashboard.tsx` (the existing client component), calling
  the endpoint via `fetch`. Loading, error, and no-data states inline. The
  card shows art, `name`, `artist`, `"{playCount} plays this week"`, a link
  to `lastfmUrl`, and an "Open in Spotify" link to `spotifySearchUrl`.

- **Admin gate:** v1 relies on the DB-role check inside `requireAdmin()`
  (`user.role === "ADMIN"`), consistent with the other admin API routes. (The
  separate `ADMIN_EMAILS` allowlist that the cron route uses is a different
  mechanism — not needed here.)

No new library module is strictly required for one call, but a thin
`src/lib/lastfm.ts` (build URL, fetch, parse, normalize) is worth it since
the real feature will reuse it — the agent can decide.

## Config

Two new environment values (add to `.env` / `.env.local` and Vercel):

- `LASTFM_API_KEY` — the key from step 4.
- `LASTFM_TEST_USERNAME` — Dylan's Last.fm username, for v1 only.

Using an env var for the username (rather than a `User` field) keeps v1 free
of schema changes. The real feature moves this to `User.lastfmUsername` per
account; the env value goes away then.

Two more, for the Spotify album-art resolver (optional — if unset, the route
silently falls back to Last.fm's image):

- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` — a Spotify app's Client
  Credentials flow keys (app-only auth, no per-user login/consent). Create
  one at <https://developer.spotify.com/dashboard>: "Create app," any name/
  description, any placeholder Redirect URI (required by the form but unused
  by this flow), Web API checked. Copy the Client ID and Client Secret into
  `.env`/`.env.local` and Vercel.

## Compliance (Last.fm API ToS)

Not legal advice — but here's how this maps to the
[Last.fm API Terms](https://www.last.fm/api/tos), so the build doesn't bake in
wrong assumptions.

**v1 (this admin-only spike) is in a safe spot.** Personal, non-commercial
testing of the owner's own listening data (§3.1), from a registered account
(§2.2); stores essentially nothing, far under the 100 MB cap (§4.3.4); makes a
trivial number of requests (§4.4); and the result card links to the track's
Last.fm page (§2.7). It is not a public page. The only caveat even here:
**album artwork is excluded from the licence** (§5.1.8) — fine to show on a
private admin screen, but don't treat Last.fm art as licensed going forward.

**Before a user-facing version ships, resolve three things — do not build
past them:**

1. **Commercial vs non-commercial (§3.1–3.2, and the note atop the ToS).** The
   licence is "solely for non-commercial purposes." "No ads" does not by
   itself make Rogha non-commercial — running it as a product/company/service
   can count as commercial, which requires a commercial-use agreement first
   (`partners@last.fm`). This is a judgment call about Rogha's intent and
   structure; settle it (email or legal advice) before launch, not in code.
2. **Attribution (§2.7).** Add a "powered by AudioScrobbler" credit linking to
   Last.fm, and deep-link correctly: profile info → `last.fm/user/<username>`,
   track info → `last.fm/music/<artist>/_/<track>`. The track link exists in
   the v1 card; the AudioScrobbler button is the missing piece.
3. **Album art (§5.1.8).** ~~Source cover art from the Spotify-link
   resolver, or omit it — don't serve Last.fm image URLs in the public
   feed.~~ **Done** — `src/lib/spotify.ts` resolves album art via Spotify's
   Search API (Client Credentials flow) and the route prefers it over
   Last.fm's image (`imageSource: "spotify" | "lastfm" | null` on the
   response, so the UI/logs can tell which source served a given card).
   Falls back to the Last.fm image if Spotify isn't configured or has no
   match for the track — this admin screen is still fine either way per the
   v1 compliance note above, but the fallback is now the *rare* path instead
   of the only path.

Also §2.7's "public pages… approved by Last.fm in writing" — rarely enforced,
but it exists; the `partners@last.fm` contact covers it.

## Testing / verification

- **Layer:** web only. This is a plain API route + client component — nothing
  touches Capacitor or native config. Testable in the **dev server**; visible
  in the native app only after a **web deploy**. **No Xcode rebuild.**
- **Manual check:** with a few recent scrobbles, the button returns a
  sensible #1. Then confirm the no-data path (a Last.fm account with no
  listens in 7 days, or a throwaway username) and the bad-key path (temporarily
  wrong `LASTFM_API_KEY`) both render cleanly rather than throwing.
- Confirm the API key never appears in the network response or client bundle.

## Later, not now

Captured so the spike stays honest about what it isn't:

- **Per-user accounts** — `User.lastfmUsername` + a "Connect music" settings
  field, replacing `LASTFM_TEST_USERNAME`.
- **Edition-week alignment** — swap `period=7day` for
  `user.getWeeklyTrackChart` / `user.getRecentTracks` with `from`/`to`
  matching the edition's exact window.
- **Capture + storage** — a `WeeklyTrack (userId, editionId)` entity,
  populated by extending the Sunday `publishEditionForWeek()` cron.
- **Reveal** — a song card on the Edition post, gated by the existing
  `canViewPostPolicy` audience rules.
- **Opt-in / privacy** — a per-user toggle; off by default, matching Rogha's
  small-and-deliberate ethos.
