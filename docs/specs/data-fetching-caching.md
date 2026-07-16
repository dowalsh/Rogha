# Spec: client-side data fetching & navigation caching

**Status:** implemented (editor, buzz feed, likes, editions). Not yet applied app-wide — see "Not yet migrated" below.
**Scope:** introduces SWR as the app's client-side caching layer, plus targeted prefetch/TTL tuning for the editions flow.

---

## Goal

Reduce how "slow" navigating between pages feels. Before this, every client
component fetched its data via `useEffect` + `fetch()` + local `useState` —
meaning every remount (including navigating back to a page you'd just been
on) triggered a full cold refetch, with no cache and no way to warm data
ahead of a click.

## The pattern: SWR as a shared, app-wide cache

`src/components/providers/SWRProvider.tsx` wraps the whole app (mounted in
`src/app/layout.tsx`, inside `TooltipProvider`) with an `SWRConfig` using a
single shared fetcher (`src/lib/swr.ts`) and `revalidateOnFocus: false` /
`dedupingInterval: 5000` as sane defaults. Because it's one provider at the
root, **the cache persists across client-side navigation** — any component
anywhere that calls `useSWR(sameUrl)` shares the same cached response.

Convention: SWR keys are just the request URL (e.g. `/api/circles`,
`/api/posts/${id}`). Two components fetching the same URL automatically
share one cache entry — no manual coordination needed, which is why keeping
API endpoints 1:1 with what they return matters (see the editions case
below, where two *different* endpoints happen to return identical data and
had to be explicitly reconciled).

### Migrated so far
- `src/app/editor/[id]/page.tsx` — post + circles data.
- `src/components/buzz/BuzzSection.tsx` — home feed.
- `src/components/LikeButton.tsx` — likers list (see "Delayed-key priming" below).
- `src/components/editions/LatestEditionPreloader.tsx` + `src/app/editions/page.tsx` — see "Editions" below.
- `src/app/reader/[id]/page.tsx` — reads `/api/posts/${id}` via `useSWR`,
  which is what makes it possible to seed that cache key from the edition
  payload; see "Seeding reader caches from the edition payload" below.

### Not yet migrated
Still on the old `useEffect`+`fetch` pattern, no cross-navigation cache:
`src/app/posts/page.tsx`,
`src/components/CommentsSection.tsx`, `src/app/settings/page.tsx`,
`src/app/admin/*`, `src/components/FriendsCarousel.tsx`,
`src/components/ShareLinkControls.tsx`, and a few smaller ones. Migrating
any of them is the same mechanical swap shown in the migrated files above —
no further plumbing needed, the provider is already global.

## Non-obvious technique: seeding the cache instead of double-fetching

`LikeButton` and `LatestEditionPreloader` both need to fetch data
*speculatively*, ahead of the user needing it, without blocking or
double-fetching. Pattern used in both:

```ts
const [primed, setPrimed] = useState(false);
useEffect(() => {
  const timer = setTimeout(() => setPrimed(true), delayMs);
  return () => clearTimeout(timer);
}, [...]);
const { data } = useSWR(primed ? url : null, ...);
```

Passing `null` as the key is SWR's built-in way to say "don't fetch yet."
The delay (400ms for likes, 1000ms for the edition) exists so this
background fetch doesn't compete with the page's own primary data fetches
for bandwidth/connection slots. When the user actually triggers the real
UI (opens the likers dialog, clicks into the edition), the component either
already has cached data (instant) or falls back to a normal fetch if the
delay hadn't elapsed yet.

## Editions: sharing one fetch's result across two different pages

`/api/editions/latest` and `/api/editions/[id]` call the exact same server
function (`getPublishedEditionById`) and return byte-identical shapes for
the latest edition — confirmed by reading both route handlers
(`src/app/api/editions/latest/route.ts`, `src/app/api/editions/[id]/route.ts`).
`LatestEditionPreloader` (runs on the home feed) fetches `/api/editions/latest`
for its own purposes (warming hero images + prefetching the route); since
that response is identical to what `/api/editions/page.tsx`'s "Latest
Edition" preview would separately fetch via `/api/editions/${id}`, the
preloader also seeds that second cache key directly, at no extra request
cost:

```ts
mutate(`/api/editions/${edition.id}`, edition, { revalidate: false });
```

This only works because both endpoints are confirmed identical — don't copy
this pattern for two endpoints without checking their handlers return the
same shape.

**Deliberately not preloaded:** `/api/editions` (the full archive list).
`getPublishedEditions()` runs an unbounded query — every published edition,
ever, each with its own posts query — so firing it speculatively on every
home-page visit would be wasteful and get worse as the archive grows. It
still benefits from ordinary SWR caching (instant on revisit within the
dedupe window), just not warmed ahead of time.

**Image cache mismatch (bug found and fixed):** `LatestEditionPreloader`
warms hero images by rendering invisible `next/image` tags — but
`/editions/page.tsx`'s preview originally used raw `<img>` tags, which
request the *original* unoptimized URL, not the `next/image`-optimized URL
the preloader actually warms. These are different URLs entirely, so nothing
was shared until the preview was switched to `next/image` with the same
`sizes` prop `Frontpage` (the real `/editions/[id]` page) uses. Any future
image preloading only pays off if every consumer of that image renders it
through `next/image` with matching `sizes` — a raw `<img>` or a different
`sizes` value produces a different request URL and silently misses the
warm cache.

## Seeding reader caches from the edition payload

Same pattern as the editions cache-seed above, one level deeper: the first
click into *any post* from the latest edition used to be a cold
`/api/posts/${id}` fetch, because SWR only speeds up re-visits — a flow
that's inherently all-first-visits (open app → latest edition → read post)
never benefited from it.

`getPublishedEditionById` (`src/lib/editions.ts`) already selects each
post's full `content`, plus (as of this change) `_count.likes` and a
viewer-scoped `likes` join, mapped into `likeCount`/`likedByMe` on each
returned post; `author` now also selects `clerkId`. In other words,
`LatestEditionPreloader` already has every post body in hand once
`/api/editions/latest` resolves — it was just being discarded after
warming images and the route.

`LatestEditionPreloader` now maps each post through a local `buildPostDTO()`
into the exact shape `/api/posts/[id]` returns, and seeds that endpoint's
SWR cache directly, plus prefetches the reader route's shell:

```ts
for (const post of edition.posts ?? []) {
  mutate(`/api/posts/${post.id}`, buildPostDTO(post, edition), {
    revalidate: false,
  });
  router.prefetch(`/reader/${post.id}`);
}
```

This only works end-to-end because `src/app/reader/[id]/page.tsx` reads
through `useSWR(`/api/posts/${id}`)` (not a `cache: "no-store"` fetch) —
if that ever regresses back to a bypassing fetch, the seed becomes dead
weight.

**Scope guardrail, same reasoning as the archive list above:** this only
covers the *current* latest edition's posts (bounded — one edition's worth
of posts, already being fetched anyway for images/route-warming). It does
not extend to older editions or `/posts` (the personal posts list) — those
would need their own bounded justification before preloading.

**Side effect of reusing this data:** the edition detail page
(`src/app/editions/[id]/page.tsx`) spreads each post's full DB row
(`...p`) into the client-facing `EditionResponse` payload, so `content`,
`likeCount`, `likedByMe`, and `author.clerkId` now ride along in that
page's RSC payload too — not new exposure (`content` was already selected
and spread before this change), just a few more bytes per post.

## Route prefetch tuning

`LatestEditionPreloader` calls `router.prefetch(href, { kind: "full" })`
(not the default `"auto"`) for both `/editions/${id}` and `/editions`.
`"auto"` only prefetches the static shell for `force-dynamic` routes;
`"full"` forces Next to actually run the target page's server render (its
Prisma query included) ahead of time and cache the result. This is safe
here specifically because `getPublishedEditionById` is read-only — no view
counters or "opened" flags are written by the read itself — so speculative
execution has no side effects. The only cost is `viewerCount`/`viewerNames`
can be a few seconds stale if a friend opens the edition in the gap between
prefetch and click.

`{ kind: "full" }` isn't in the public `next/navigation` router types (only
`next/dist/.../router-reducer-types` exports `PrefetchKind`, an internal
path), so the call site casts through a local `FullPrefetchRouter` type
rather than importing Next's internal module — avoids a dependency on an
internal file path that could move between Next versions.

**`next.config.mjs`: `experimental.staleTimes.dynamic = 60`.** Next's
default TTL for a prefetched *dynamic* route in the client router cache is
30s. The preloader fires ~1s after the home feed loads, but a realistic
gap between that and the user actually clicking through (reading the feed,
checking a notification, etc.) can easily exceed 30s — at which point the
prefetch is silently discarded and the click falls back to a cold fetch,
defeating the whole point. Bumped to 60s. This setting is global — it
affects the staleness window for *any* dynamically prefetched route in the
app (including default `<Link>` hover-prefetches elsewhere), trading a
larger window for potentially-stale data on navigation. Acceptable here
because nothing in this app needs second-to-second freshness; revisit if
that changes for some future route.

## Verification approach used

No automated tests added — this is a perceived-performance change, verified
by:
- `tsc --noEmit` and `next build` after each change (catches wiring/type
  regressions, not perf).
- Manual Network-tab inspection: confirming background prefetch requests
  fire on schedule, hero images resolve `(disk cache)`/`(memory cache)`
  with single-digit ms timings, and re-visited pages show cached data with
  no new network request.
- Chrome DevTools network throttling (Slow 3G) to make cold-vs-warm timing
  differences visible — on an unthrottled local connection everything is
  fast enough that the difference isn't perceptible either way.
- Confirming via `git stash` that pre-existing issues encountered along the
  way (e.g. an unrelated SSR crash in the editor page) predate this work,
  before attributing them to it.

## Suggested commit message

```
perf: introduce SWR caching and tune editions prefetching

Add an app-wide SWR cache (editor, buzz feed, likes, editions), seed
the editions detail cache from the home-feed preloader's existing
fetch, force a full route prefetch for the latest edition (safe: the
underlying read has no side effects), fix a raw-<img>/next-image cache
mismatch on the editions list preview, and extend the dynamic-route
prefetch TTL so warm-ups survive a realistic browsing pause.
```
