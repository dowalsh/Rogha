# Official Posts — Editor's Note & Community Feature

**Status:** Implemented
**Date:** 2026-08-07

Rogha's creator wants a way to publish official, first-party content into the app — a recurring "Editor's Note" (creator commentary: features, users, direction) and "Community Feature" (spotlighting real Rogha posts from real users as inspiration). This spec defines the minimal design to support both.

The guiding constraint is **minimal footprint**: the existing `ALL_USERS` audience already does most of the work (admin-only, server-enforced, visible to everyone, swept into the weekly edition and rendered as a readable piece). This spec adds only what `ALL_USERS` doesn't already provide — official authorship branding, a type marker, bottom placement, and an admin notification toggle.

## Goals

- An admin can compose a post and mark it as an **Editor's Note** or **Community Feature**, published to all Rogha users.
- Such a post displays as authored by **"Rogha"** with the app logo as its avatar, not the admin's personal identity.
- Official posts live **inside the weekly edition** (no separate section), pinned to the bottom, just above the Weekly Jam card.
- Official posts behave like normal posts everywhere else: they flow through the Coming Sunday queue, respect the weekly reveal gate, and support comments and likes.
- The admin can optionally suppress the launch notification (silent by default; opt-in to notify everyone).

## Non-goals (MVP)

- **No separate "From Rogha" section or archive.** Official posts are distinguished by their title convention, Rogha authorship, and bottom placement — not by a dedicated surface.
- **No post embedding.** A Community Feature is prose the admin writes that references/links example posts manually; it does not pull another user's post content in as a structured embed.
- **No separate "Rogha" login/account.** Authorship is presentational (see below), not a real second `User`.
- **No dedicated visual badge/type styling.** The manual title convention plus Rogha authorship do the distinguishing work.
- **No instant/mid-week publish.** Official posts respect the normal weekly cadence — they wait for the Sunday cron like any other post.

## Data model

One new enum field on `Post` and one new boolean, both in [`prisma/schema.prisma`](../../prisma/schema.prisma):

```prisma
enum OfficialKind {
  EDITORS_NOTE
  COMMUNITY_FEATURE
}

model Post {
  // ...existing fields...
  officialKind   OfficialKind?  // null = a normal post (default)
  notifyAllUsers Boolean  @default(false) // admin-set; only meaningful when officialKind != null
}
```

- **`officialKind`** is the single marker that drives official behavior. When non-null, the post is: authored-as-Rogha (presentationally), forced to `ALL_USERS` audience, and pinned to the bottom slot. `null` means an ordinary post — unchanged behavior.
- **`notifyAllUsers`** is the notification toggle. Default `false` preserves today's behavior (`ALL_USERS` posts are silent). When an admin sets it `true` on an official post, publishing fans out a `SUBMIT` notification to every user. This field is meaningless (ignored) for non-official posts.

`officialKind` and `audienceType` are coextensive-by-rule for official posts: setting `officialKind` implies `audienceType = ALL_USERS`. We keep `audienceType` as the actual audience field (all the visibility/query machinery already keys off it) and treat `officialKind` as the additive "this is branded first-party content of type X" layer on top.

## Authoring

### Access

Admin-only, gated on `User.role === "ADMIN"` — the same check already enforced server-side in [`src/app/api/posts/[id]/route.ts`](../../src/app/api/posts/[id]/route.ts) (the existing `ALL_USERS` guard at ~line 149). Extend that guard: a non-admin supplying any non-null `officialKind` (or `notifyAllUsers`) is rejected, exactly as they're rejected for `ALL_USERS` today.

### Composer UI

In the post editor ([`src/app/editor/[id]/page.tsx`](../../src/app/editor/[id]/page.tsx)), where the `ALL_USERS` audience radio is already conditionally rendered for admins (`isAdmin` block, ~line 418), add an admin-only **Post type** selector:

- **Normal** (default) — ordinary post, existing audience picker (`FRIENDS` / `CIRCLE`) applies.
- **Editor's Note** — sets `officialKind = EDITORS_NOTE`, forces `audienceType = ALL_USERS`, hides the normal audience picker.
- **Community Feature** — sets `officialKind = COMMUNITY_FEATURE`, forces `audienceType = ALL_USERS`, hides the normal audience picker.

When Editor's Note or Community Feature is selected, also show an admin-only **"Notify all users"** checkbox (backing `notifyAllUsers`, default off).

The whole selector is hidden for non-admins — a regular user's composer is unchanged.

### Title convention (manual)

Titles are typed by hand — the app does **not** auto-format or auto-number them. The agreed conventions the admin follows:

- Editor's Note: `Editor's Note {ROMAN NUMERAL}: {tagline}` — e.g. `Editor's Note I: The launch`.
- Community Feature: `Community Feature: {post name}`.

No roman-numeral computation, no auto-prefixing. (If auto-numbering is wanted later, it becomes a follow-up — the `officialKind` field is already the hook that would make counting prior Editor's Notes possible.)

## Presentational Rogha identity

Authorship is **presentational**, not a real account. The post's `authorId` remains the admin who wrote it — so the admin keeps normal edit/delete ownership, and reply notifications on the post route back to them. Only the *display* is overridden.

Author name and avatar are already centralized — `getAuthorName()` in [`src/components/Frontpage.tsx`](../../src/components/Frontpage.tsx) (~line 71), the reader header, and comment rendering. When `post.officialKind != null`:

- Display name → **"Rogha"**.
- Avatar → the app logo, [`public/logo.png`](../../public/logo.png).
- The author is **not a link** — no profile page navigation.
- The **report/block overflow menu is suppressed** — you can't block Rogha. (`ContentOverflowMenu` in [`src/components/ContentOverflowMenu.tsx`](../../src/components/ContentOverflowMenu.tsx) is not rendered for official posts.)

Because this override lives in the shared author-render helpers, it applies consistently across the edition front page, the reader, and the Coming Sunday preview.

## Placement in the edition

Official posts render **inside the edition**, pinned to a fixed bottom zone — mirroring the Weekly Jam pattern rather than interleaving by recency.

The edition front page ([`src/components/Frontpage.tsx`](../../src/components/Frontpage.tsx)) already uses a discriminated `FrontpageItem` union (`{ kind: "post" } | { kind: "jam" }`) and appends the Jam card last (~line 315–317). Official posts stay `kind: "post"` items but are **ordered last among the posts**, so the final stack is:

```
friends' / circle posts (by recency)
  → Rogha official posts (Editor's Note, Community Feature)
    → Weekly Jam card (always last)
```

Concretely: where the edition page assembles `posts` for `Frontpage` ([`src/app/editions/[id]/page.tsx`](../../src/app/editions/[id]/page.tsx)), sort posts so that `officialKind != null` sorts after `officialKind == null`, preserving recency order within each group. No new `FrontpageItem` kind is required — official posts reuse the normal post card, differing only in the presentational identity above.

The same "official posts sort last" ordering should apply to the editions listing preview and the archive list, matching how Jam is described as living in a fixed slot across those surfaces.

## Lifecycle, cadence & Coming Sunday

Official posts follow the **normal post lifecycle** — `DRAFT → SUBMITTED → PUBLISHED` — and are published by the existing Sunday 07:00 UTC cron ([`src/lib/editions.ts`](../../src/lib/editions.ts), via [`src/app/api/cron/publish-weekly/route.ts`](../../src/app/api/cron/publish-weekly/route.ts)). There is **no instant/mid-week publish path**; an official post submitted this week appears at the next Sunday reveal, exactly like any other post.

**Reveal gate:** official posts are reveal-gated like normal posts — they're hidden behind the edition blur and revealed when the viewer opens the edition. They are not always-open. ("Roll them in" with the rest of the edition's posts.)

**Coming Sunday:** an official post must appear in *every* user's Coming Sunday queue while `SUBMITTED` (titles visible, thumbnails blurred), consistent with "behaves like a normal post." Today the queue query `getComingNext()` in [`src/lib/home.ts`](../../src/lib/home.ts) (~line 122) selects `status: "SUBMITTED"` with `OR: [{ authorId: userId }, { authorId: { in: friendIds } }]` — which would only surface an official post to the admin and their friends. **Add** `{ audienceType: "ALL_USERS" }` (equivalently `{ officialKind: { not: null } }`) to that `OR` so every user sees a queued official post. Its `authorName` in the preview must use the presentational "Rogha" identity.

## Comments & likes

Official posts **support comments and likes** like normal posts, with the existing `ALL_USERS` visibility caveat made explicit to the admin: because the post is visible to all users, **all comments are visible to all users** (comments inherit their parent post's visibility). This is a broader audience than a `FRIENDS` post's comments — the admin should be aware every user can both read and add comments.

Reply/comment/like notifications on an official post route to the real `authorId` (the admin), so the creator sees engagement. Standard moderation applies (admins can remove comments; users can report/block other commenters normally — the block/report suppression above is only for *the Rogha author*, not for other users commenting on the post).

## Notifications

The `SUBMIT` fan-out in [`src/actions/notification.action.ts`](../../src/actions/notification.action.ts) currently early-returns for `ALL_USERS` (no notifications, ~line 406). Change:

- If the post is official (`officialKind != null`) **and** `notifyAllUsers === true` → fan out a `SUBMIT` notification to **all users** (respecting each user's `NotificationPreference` for in-app/email/push, like every other notification).
- Otherwise (official but `notifyAllUsers === false`, or any non-official `ALL_USERS` post) → remain silent, as today.

Default is silent. The admin opts in per-post via the composer checkbox. For a large user base this is a broadcast — intended for launch-style announcements.

## Visibility / access

No change to the access policy is needed for the *audience* half: official posts are `ALL_USERS`, which [`src/lib/access/postAccess.ts`](../../src/lib/access/postAccess.ts) already treats as visible to everyone (`buildAudienceCandidateWhere` includes `{ audienceType: "ALL_USERS" }`, ~line 31; the policy switch handles `ALL_USERS` at ~line 86). The temporal friend/circle gates don't apply to `ALL_USERS`. This spec adds no new visibility rules — it only layers presentation and placement on top of the existing `ALL_USERS` visibility.

## Implementation touchpoints (summary)

| Area | File | Change |
|---|---|---|
| Schema | `prisma/schema.prisma` | Add `OfficialKind` enum; add `Post.officialKind` + `Post.notifyAllUsers` |
| Write guard | `src/app/api/posts/[id]/route.ts` | Reject non-admins setting `officialKind`/`notifyAllUsers`; force `ALL_USERS` when official |
| Composer | `src/app/editor/[id]/page.tsx` | Admin-only Post-type selector + "Notify all users" checkbox |
| Author display | `src/components/Frontpage.tsx` (+ reader header) | Presentational "Rogha" + logo, non-linked, suppress overflow menu when `officialKind != null` |
| Placement | `src/app/editions/[id]/page.tsx` | Sort official posts last (above Jam) in the assembled `posts` |
| Coming Sunday | `src/lib/home.ts` | Add `ALL_USERS`/official to the `getComingNext` queue `OR`; use Rogha identity in preview |
| Notifications | `src/actions/notification.action.ts` | Fan `SUBMIT` to all users when official + `notifyAllUsers` |

## Deferred (possible phase 2)

- Auto-numbering of Editor's Notes (roman numerals) and title auto-formatting.
- A dedicated "From Rogha" section/archive if the pinned+title-convention treatment proves too subtle.
- Structured embedding of a featured user's post inside a Community Feature (with that post's own visibility/permission handling).
- A generic official post type (official but neither Editor's Note nor Community Feature).
- Instant/mid-week publish for time-sensitive announcements.

## Docs to update on implementation

When this ships, update:

- [`docs/reference/product-spec.md`](../reference/product-spec.md) — Post section (new official-post behavior, placement, notification change) and Non-goals (`ALL_USERS` is now also the substrate for branded official content).
- [`docs/reference/data-model.md`](../reference/data-model.md) — `Post` entry for `officialKind` / `notifyAllUsers`.
