# Spec: End-of-article edition navigation ("Keep reading")

## Goal
Remove the hub-and-spoke tax on reading through an edition: today, moving from
one article to the next requires backing out to the edition page and drilling
back in. Since the edition's reveal gate is edition-level (not per-post — once
you've opened the edition, every article inside is already revealed), there's
no ritual cost to article-to-article movement. Give the reader an onward path
at the natural break: the end of the article, after they've engaged with
comments.

## Behaviour
- On reaching the end of an article, render a block listing the other posts in
  the same edition.
- Unread posts render as primary cards. Already-read posts are tucked under a
  de-emphasized, collapsed "Already read this week (N)" disclosure — present
  but not competing for attention.
- Shows **all** remaining posts in the edition, not a capped preview — editions
  are small and weekly by design, and capping would reintroduce the
  back-out-to-see-everything problem.
- Card contents: author, title, hero thumbnail, read/unread indicator.
- When nothing unread remains, the block collapses to a single "you're all
  caught up this week" state with one action back to the edition — no cards.
- Placement: after the comments section (`#comments`), before the jump FAB.
  Reading order is finish article → engage (comments) → decide where next.

## Data
No schema change — `PostRead` (read/unread), `Post.heroThumbUrl` /
`heroThumbBlurUrl`, and `Post.editionId` already carried everything needed.

`getPublishedEditionById` (`src/lib/editions.ts`) already computed a
per-viewer read map to sort unread-first; it now also attaches that as
`readByMe: boolean` on each returned post, so any consumer of
`GET /api/editions/[id]` gets read state for free. Pre-existing posts with no
`PostRead` row (from before `PostRead` was introduced) are treated as unread —
no backfill was done and none is needed here.

Ordering within the unread/read groups is unspecified/not important per
product owner — both groups keep the query's existing default order
(`updatedAt desc`).

## Client
`src/components/reader/EditionUpNext.tsx` fetches `/api/editions/${editionId}`
via SWR — the same key already used and cached by `src/app/editions/page.tsx`
and primed by `LatestEditionPreloader`, so no new API route was added. It
filters out the current post, splits the rest into unread/read, and renders:
- Unread: `FeedPostRow` (`variant="new"`), linking to `/reader/${id}/edition`.
- Read: same component (`variant="earlier"`) inside a `<details>` disclosure.
- Empty-unread: a "you're all caught up this week" card linking back to the
  edition (`fallbackBackHref`, already computed in the reader page).

Wired into `src/app/reader/[id]/[[...from]]/page.tsx` immediately after the
`#comments` block, gated on `post.editionId` being present.

## Testing depth
- **Dev server / browser:** fully testable as-is (page, component, and a
  server-side field addition only).
- **Native app:** needs a **web deploy** to wherever `server.url` /
  `CAP_SERVER_URL` points before it shows in the iOS shell.
- **Xcode rebuild:** **not** required — nothing here touches
  `capacitor.config.ts`, native plugins, `Info.plist`, or the Xcode project.

Verify: (a) an edition with multiple unread posts shows them all as primary
cards; (b) reading one and returning moves it under "Already read this week";
(c) once everything's read, the block shows the caught-up state instead of
cards; (d) a single-post edition also resolves to the caught-up state (no
siblings to show); (e) cards navigate straight into the target post without
re-triggering the reveal overlay.
