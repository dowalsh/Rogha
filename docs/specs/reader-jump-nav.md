# Spec: Reader jump navigation (comments ↔ top) + "N new" header signal

## Goal
On the reader page (`src/app/reader/[id]/[[...from]]/page.tsx`), give a returning
reader two things:

1. **A "N new" jump-to-comments signal in the header** — the returning reader's
   real motive is *"has the conversation grown since I last read this?"*, not
   just *"get me to the comments."* We already compute exactly this number for
   the home page's New buzz badge, so surface it here too.
2. **A single floating action button (FAB) that flips direction** — `↓ Comments`
   while reading the body, `↑ Top` once at/near the comments. One control, one
   screen slot, always the "other end" one tap away. This is generic long-page
   locomotion, independent of whether there's new activity.

These are deliberately **two affordances doing two jobs**: the header count
answers *whether to jump* (a pre-scroll decision, so it lives in the header); the
FAB answers *take me to the other end* (an in-scroll action, so it lives at the
thumb). Keep the FAB generic — do NOT put the "N new" count on the FAB. The
header owns freshness; the FAB owns locomotion.

## Data: compute `newCommentCount` server-side (do NOT pass via nav)

Add `newCommentCount: number | null` to the `/api/posts/[id]` response DTO
(consumed by the reader via SWR at `page.tsx` line ~122).

- Locate the handler (likely `src/app/api/posts/[id]/route.ts`).
- For the signed-in viewer, look up their `PostRead.readAt` for this post
  (reuse `src/lib/postReads.ts`; mirror the logic in `src/lib/home.ts`
  `getBuzzPosts`, lines ~294–306).
- `newCommentCount` = count of `Comment` rows on this post with
  `status = ACTIVE` and `createdAt > readAt`, **including replies** (mirrors
  home's "comment or reply" definition; likes never count, which the `Comment`
  table gives us for free).
- **Degrade rule:** if there is no `PostRead` row for this viewer (they've never
  opened the post), return `newCommentCount: null` — a first-time reader has no
  "since last time" baseline, and "everything is new" is noise, not signal.
  Return `null` (not `0`) so the client can distinguish "no baseline" from
  "baseline exists, nothing new."

### Ordering note (important)
The reader fires `POST /api/posts/[id]/read` in a mount effect (`page.tsx`
lines ~154–161), which bumps `readAt` to now. That effect runs *after* the
`GET /api/posts/[id]` SWR fetch resolves (it depends on `post?.id`), so the GET
reflects the **pre-mount** `readAt` and returns the correct arrival-time count.
Do not reorder these.

## Client: snapshot the count so it survives revalidation

In `page.tsx`, the post DTO comes from SWR, whose cache is shared with the editor
page and **revalidates on remount once stale** (see comment at lines ~114–122).
After the read-POST bumps `readAt`, any SWR revalidation would recompute
`newCommentCount` to `0` and zero the badge mid-session.

So: **capture `newCommentCount` into a ref/state the first time `post` is
defined, and render the header badge off that snapshot** — never bind the badge
directly to the live SWR value.

```ts
const arrivalNewCount = useRef<number | null | undefined>(undefined);
useEffect(() => {
  if (post && arrivalNewCount.current === undefined) {
    arrivalNewCount.current = post.newCommentCount ?? null;
  }
}, [post]);
```

## UI 1 — Header "N new" affordance

In the `<header>` block (`page.tsx` lines ~331–361), near the `author · date`
line, render a tappable pill **only when `arrivalNewCount.current` is a number
> 0**:

- Label: `💬 {n} new` with a down chevron, e.g. `💬 3 new ↓`.
- On tap: smooth-scroll to the comments anchor (see anchor below).
- When `arrivalNewCount.current` is `null` or `0`: render nothing. (The FAB
  still provides a `↓ Comments` path, so nothing is lost.)
- Optional polish: hide this pill once the comments anchor is on screen (it has
  served its purpose and the FAB now reads `↑ Top`).

Style it consistently with existing muted/secondary UI (it sits in the
`text-sm text-muted-foreground` metadata row). Give it an `aria-label` like
`"Jump to 3 new comments"`.

## UI 2 — Flipping FAB

New component, e.g. `src/components/reader/ReaderJumpFab.tsx`, rendered inside
the reader container.

- **Anchor:** add `id="comments"` (and/or a forwarded ref) to the
  `CommentsSection` wrapper so both the header pill and the FAB have a scroll
  target. If adding an id to `CommentsSection` is awkward, wrap its render site
  in `page.tsx` with `<div id="comments" className="scroll-mt-24">`.
- **Position:** fixed, bottom-right, respecting safe-area insets (the page
  already uses `env(safe-area-inset-*)`; match that). Above the comments
  compose box if it overlaps.
- **State machine (two states):**
  - `above` → label `↓ Comments`, tap scrolls to `#comments`.
  - `atComments` → label `↑ Top`, tap scrolls to `window` top.
- **Flip trigger:** `IntersectionObserver` on `#comments`. When the anchor's top
  enters the viewport (or crosses ~60% down), switch to `atComments`; when it
  leaves upward, switch back to `above`. Prefer IntersectionObserver over a
  scroll-position listener.
- **Visibility:** hide the FAB when the page isn't tall enough to scroll
  meaningfully (e.g. content + comments fits in one viewport) — no point showing
  it on short posts. Optionally fade in after the reader has scrolled a bit.
- **Scroll behavior:** `scrollInto+/scrollTo` with `behavior: "smooth"`, but
  respect `prefers-reduced-motion` (fall back to instant).
- **A11y:** it's a `<button>` with a dynamic `aria-label`
  (`"Jump to comments"` / `"Back to top"`); keyboard-focusable.

## Explicitly out of scope (keep it tight)
- No total comment count in the header (would need another server field; the
  "N new" signal is the one that earns its place). Only add later if asked.
- No sticky mini-bar, no second back-to-top control. One FAB, one header pill.
- Don't change the read-tracking timing or the `from`-on-path convention.

## Testing depth
- **Dev server / browser:** fully testable as-is (page, component, and API
  route changes only).
- **Native app:** needs a **web deploy** to wherever `server.url` /
  `CAP_SERVER_URL` points before it shows in the iOS shell.
- **Xcode rebuild:** **not** required — nothing here touches
  `capacitor.config.ts`, native plugins, `Info.plist`, or the Xcode project.

Verify: (a) arriving via New buzz shows the correct `N new` and the pill scrolls
to comments; (b) the badge does NOT reset to 0 when SWR revalidates after the
read-POST; (c) first-time open (no `PostRead`) shows no pill; (d) FAB flips at
the comments boundary and both directions scroll smoothly; (e) short posts hide
the FAB.
