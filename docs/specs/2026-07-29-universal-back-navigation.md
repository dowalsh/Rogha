# Spec: universal "back to where I came from" navigation

**Status:** draft — for review. No option has been selected yet.
**Scope:** open — this doc lays out several designs of different sizes; the chosen one determines actual scope.

---

## Problem

Back navigation today is ad hoc and inconsistent:

- Most pages have **no back affordance at all** — the only way "back" is the OS-level swipe gesture (native) or browser back button (web).
- Where a back button does exist, each page reinvents it differently:
  - `src/app/admin/posts/[id]/page.tsx` and `src/components/TermsGate.tsx` call `router.back()` directly.
  - `src/app/reader/[id]/[[...from]]/page.tsx` instead computes an explicit `backHref` from a `from` route param (e.g. `from === "buzz" ? "/" : fallbackBackHref`) and pushes to it — a different mechanism with different semantics.
- There's no shared `BackButton` component; nothing about "where did the user come from" is centralized.
- The persistent shell (`src/components/Navbar.tsx` → `DesktopNavbar`/`MobileNavbar`) has no back affordance at all — desktop has no back UI, mobile has a hamburger drawer, neither integrates with history.
- On iOS (Capacitor, server-mode WebView), there's no listener on `@capacitor/app`'s hardware/gesture `backButton` event — native swipe-back relies entirely on whatever the WebView provides by default, which is not guaranteed to match app-level navigation state (e.g. a page that was reached via `router.push` with query params may swipe back to a blank state, or exit the WebView's history and feel like it does nothing).
- Modals/sheets (Radix `Dialog`/`Sheet`, used by `CircleDialog`, `NewCircleDialog`, `DeleteAlertDialog`, `MobileNavbar`'s drawer) are dismissed via local `open` state, not history — so a hardware/gesture back action doesn't close them, it falls through to whatever's underneath (or exits the page).

The ask: make "go back to where I came from" feel consistent everywhere — same visual affordance, same behavior, works the same on web and native, and correctly closes modals before navigating pages.

## What "back" needs to mean

Before comparing options, worth being explicit that "back" is actually two different needs that often get conflated:

1. **Return to the previous screen** (browser/history back) — appropriate when the previous screen was a real navigation step (e.g. profile → post → reader).
2. **Return to a specific known parent context**, independent of how many steps the user actually took to arrive (e.g. always go to "my circle" from a post, even if the user arrived via a deep link, a notification, or three clicks through search) — this is what the existing `reader/[id]/[[...from]]` pattern is already doing with its `from` param.

Any option below has to pick (or let the page choose) between these two, because they produce different UX when the user didn't arrive via a simple linear path (deep links, opening from a notification, opening a shared link, restoring after backgrounding the app).

---

## Option A — Shared `<BackButton>` component wrapping `router.back()`

The smallest change. Add one component that renders a consistent chevron + optional label, calls `router.back()`, and falls back to a provided default `href` if there's no history to go back to (relevant for deep links / first screen in a session, where `router.back()` silently no-ops).

```tsx
<BackButton fallbackHref="/" />
```

- **Pros:** Minimal surface area — one component, adopted page by page. No global state, no history tracking of our own. Matches native web/browser back semantics exactly, so it composes correctly with the actual browser/WebView history stack (including hardware/gesture back, which already manipulates the same stack).
- **Cons:** Doesn't solve the "return to a known parent" need (item 2 above) — pages that want that (like `reader`) still need their own `from`-param logic on top. Detecting "is there history to go back to" from `router.back()` isn't directly exposed by Next's router; needs a small heuristic (e.g. track a session flag on first render, or check `window.history.length`/`document.referrer`).
- **Native/iOS:** Doesn't touch the Capacitor `backButton`/gesture handling — the gap where hardware back doesn't know about open modals remains unless paired with Option D.
- **Effort:** small —1 component + adoption across pages that want it.

## Option B — App-wide navigation-origin tracking (a lightweight nav stack)

Add a small client-side provider that records the app's own in-memory history stack (route + optional metadata) as the user navigates, independent of the browser's stack. Every page can ask "where did I actually come from within this app session" and a shared back button uses that instead of `router.back()`.

- **Pros:** Solves both needs from "What back needs to mean" — can reconstruct a real "previous screen in this session" even across non-linear entry (deep link, notification, shared link) because it's app-controlled, not browser-controlled. Single source of truth other features (e.g. breadcrumbs, "recently viewed") could reuse later.
- **Cons:** Meaningfully more machinery — a provider, a stack data structure, edge cases around back-forward-back sequences, page reloads (in-memory stack resets on refresh unless persisted to `sessionStorage`), and keeping it in sync with actual browser history so the two don't disagree (e.g. user uses browser/gesture back — does our stack pop too?). Higher risk of subtle bugs (stale entries, stack drift) than Option A.
- **Native/iOS:** Still needs pairing with Option D to intercept hardware back/gesture and consult the same stack; otherwise the app-tracked stack and the WebView's real history can disagree.
- **Effort:** medium-large.

## Option C — Explicit `from`/`returnTo` param convention, generalized

Take the pattern already used in `reader/[id]/[[...from]]` and formalize it as the standard: every internal link that can be reached from multiple contexts appends a `?from=` (or path segment) indicating the semantic origin, and each destination page maps known `from` values to a specific back destination. Ship a small shared helper (e.g. `getBackHref(from, fallback)`) instead of each page reinventing the mapping.

- **Pros:** Deterministic and explicit — "back" always goes to a meaningful parent, never a broken/blank state, regardless of how the user actually arrived (deep link, notification, share link all work identically). No dependency on browser history at all, so it's robust to reloads and to native gesture-back being unreliable.
- **Cons:** Requires every internal `<Link>`/`router.push` call site to be updated to pass the right `from`, which is a lot of call sites to audit and easy to miss one (silently falls back to default, not a hard error, so regressions are quiet). URLs get a bit noisier. Doesn't help with truly generic "go back one step" cases where there's no small fixed set of known origins.
- **Native/iOS:** Same gap as A — still needs Option D for hardware back to close modals/consult this mapping.
- **Effort:** medium, and back-loaded (adoption work is spread across many call sites over time rather than concentrated).

## Option D — Native hardware/gesture back + modal-aware dismissal layer

Orthogonal to A/B/C (pairs with any of them): listen to Capacitor's `App.addListener('backButton', …)` (and, if using iOS edge-swipe, whatever gesture hook is in play) at the root, and make it dismiss the topmost open modal/sheet (Radix `Dialog`/`Sheet` open state) if one is open, otherwise delegate to whichever "back" strategy (A/B/C) is chosen. This directly targets the modal gap called out in the problem statement — currently no back action closes a `CircleDialog`/`NewCircleDialog`/`DeleteAlertDialog`/`MobileNavbar` sheet.

- **Pros:** Closes the concrete, currently-broken case (hardware back falling through open modals) regardless of which page-level strategy wins. Relatively contained: one root-level listener + a tiny registry that open modals push themselves onto (or reuse Radix's existing focus/portal stack if it exposes ordering).
- **Cons:** Needs a way to know what's "topmost" open — if modals don't already register themselves anywhere centrally, this requires touching every modal usage to opt in (or wrapping the shared `Dialog`/`Sheet` primitives so it's automatic, which is cleaner but touches `src/components/ui/dialog.tsx` / `sheet.tsx`, shared low-level UI). Android has native hardware back; iOS does not expose an equivalent OS-level back button event the same way — worth confirming what `@capacitor/app`'s `backButton` event actually fires on iOS (it may be Android-only), in which case this option is really about the **edge-swipe gesture** and/or a persistent in-app back affordance rather than a hardware key.
- **Effort:** small-medium, but has a research spike first (confirm what back signal iOS actually gives us via Capacitor before committing to an implementation).

## Option E — Persistent in-shell back affordance (nav-bar level, not per-page)

Instead of (or in addition to) per-page back buttons, add a single conditional back chevron to the persistent `Navbar`/`MobileNavbar` shell itself, shown whenever the current route isn't a top-level destination (home, editions, circles, etc.), using whichever origin logic (A/B/C) is chosen underneath.

- **Pros:** One visual location to design and maintain instead of scattering back buttons across every page's own header; guarantees consistency for free once it's right. Natural fit with the existing sticky top `Navbar`.
- **Cons:** Needs a route classification (which routes count as "top-level" vs "sub-page") that has to be kept up to date as routes are added; some pages may want a custom label/behavior next to a generic chevron (e.g. "back to @username's profile" vs bare "back"), which pushes back toward needing per-page config anyway. Less flexible than a per-page component if individual pages have very different back semantics.
- **Effort:** medium — touches the shared shell plus a route classification list.

---

## Comparison at a glance

| Option | Solves "return to known parent" | Handles native hardware/gesture + modals | Relative effort | Main risk |
|---|---|---|---|---|
| A. Shared `<BackButton>` + `router.back()` | No | No (pair with D) | Small | History-empty edge case (deep links) |
| B. App-wide nav stack | Yes | No (pair with D) | Large | Stack/browser-history drift, reload resets |
| C. Generalized `from` param | Yes | No (pair with D) | Medium, spread out | Silent fallback if a call site misses `from` |
| D. Native back + modal dismissal | N/A (orthogonal) | Yes (its whole point) | Small–medium + spike | Unclear what iOS actually fires via Capacitor |
| E. Shell-level back affordance | Depends on underlying choice | N/A | Medium | Route classification upkeep |

## A note on combining options

These aren't fully mutually exclusive:

- **A + D** is the smallest combo that fixes both the "no back button anywhere" gap and the "modals don't respond to back" gap, without solving the "known parent" problem.
- **C + D** is the most robust for the deep-link/notification/share-link cases this app clearly cares about (native app, universal links, share tokens all bring users in sideways), at the cost of ongoing call-site discipline.
- **B** is probably overkill unless another feature (breadcrumbs, "recently viewed," etc.) would also want a real in-app nav stack — otherwise C gets the same UX outcome more simply.
- **E** is a presentation-layer choice that can sit on top of whichever of A/B/C is picked for the underlying "where do I go" logic.

## Open questions for review

1. Which of the two "back means" (previous screen vs. known parent) matters more in practice — i.e., how often do users reach a page non-linearly (deep link, notification, share link) versus by clicking through the app?
2. Is the modal-swallows-back-gesture problem (Option D) actually being felt/reported, or is this spec mainly about page-level navigation?
3. Any appetite for touching the shared `ui/dialog.tsx`/`ui/sheet.tsx` primitives (Option D's cleanest implementation), or should modal opt-in stay per-usage to limit blast radius?
4. Should this ship incrementally per-page (A/C easy to adopt gradually) or does it need to land everywhere at once for consistency (favors E)?

No implementation should start until one of these options (or a combination) is chosen.
