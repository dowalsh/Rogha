# Product Spec — Rogha

A reference for what Rogha does and how it's supposed to behave, independent of implementation. Read this before making a behavior-affecting change, and update it when behavior changes (see "When a feature is being finalized" in [CLAUDE.md](../../CLAUDE.md)).

For *how* the code is organized, see [architecture.md](./architecture.md). For the entity/relationship detail behind these concepts, see [data-model.md](./data-model.md).

## What Rogha is

Rogha ("choice" in Irish) is a small, weekly social platform for friends. Tagline: "No ads. No noise. Actually social, in the way that matters."

The stated philosophy (from the in-app About page):
1. **Not always on** — no push-driven, infinite feed. Content is gated behind a weekly reveal.
2. **Constraints breed creativity** — a weekly cadence over constant posting; quality over quantity.
3. **Shared experience** — publishing is synchronized so everyone posts and reveals together ("buzz").
4. **Small audiences** — deliberately the opposite of platforms that "strive for scale," which the product philosophy holds "kills honesty and freedom of expression."

## Non-goals

- **No public feed for ordinary users.** Posts are visible only to friends or circle members. The `ALL_USERS` audience option exists in the schema but is admin-only by convention — regular users can't broadcast site-wide. `ALL_USERS` is also the substrate for admin-authored **official posts** (Editor's Note, Community Feature) — see the Post section below.
- **No algorithmic ranking.** Content is ordered chronologically (by edition week / update time), not by engagement or relevance scoring.
- **No always-on feed.** There is no scrollable, real-time timeline — content surfaces weekly, per Edition.
- **No open circle joining.** Circles aren't discoverable or joinable by link/search — membership only grows through your existing friend graph.

## Core concepts

### Friendship
A mutual, two-party relationship gating most visibility and circle membership.

- Request/accept model: one user requests (by email), the other accepts or declines. No auto-accept.
- States: `PENDING` → `ACCEPTED`. Once accepted, `acceptedAt` is stamped — this timestamp matters (see "temporal gate" below).
- Blocking is a separate, one-directional mechanism (see Blocking) — it is not a friendship state.

### Circle
A small, named group of friends used as a posting audience.

- Anyone can create a circle; the creator is auto-joined.
- **You can only add a friend to a circle, and only if you yourself are already a member.** There's no open joining, invite link, or approval workflow.
- All members have equal standing — there is no owner/admin role within a circle. Any member can add friends or remove other members.
- No member cap.
- Leaving is a soft-remove (`LEFT` status), not a deletion.

### Edition
The weekly publishing cycle — the core rhythm of the product.

- A cron job runs **every Sunday at 07:00 UTC** and publishes all currently `SUBMITTED` posts into that week's Edition, regardless of when within the week they were submitted.
- There is no separate "locked" state — submitting a post is effectively the commitment point; the next Sunday cron will sweep it into publication.
- **Sunday live-join window.** For 24h after the reveal (Sunday 07:00 UTC → Monday 07:00 UTC — exactly the Pacific Sunday), the edition stays open to new posts written *that day*. Writing on Sunday during this window presents an explicit fork in the composer: **Submit for next week** (default — the normal path above) or **Publish to today's edition** (deliberate opt-in — `DRAFT → PUBLISHED` immediately, `editionId` set to the edition revealed that morning, no wait for next Sunday). The fork only applies to posts written *during* the window itself — a post already `SUBMITTED` earlier in the week has no "pull forward," since it's already queued for the very next reveal. After the seal (Monday 07:00 UTC) Sunday writing reverts to the normal submit-for-next-week path. Live-joined posts obey the same audience/visibility rules as any other post and ride the edition's existing "N unread" count — no bespoke UI for having joined mid-day. Monday–Saturday is unaffected; there is no mid-week instant publish. Full spec: [2026-08-13-sunday-live-join.md](../specs/2026-08-13-sunday-live-join.md).
- Editions support a **reveal gate**: posts are hidden behind a blurred overlay ("N others already opened this week") until the viewer explicitly clicks to open it. This is a ritual/pacing mechanic, not a reciprocity gate — you do **not** need to have posted yourself to open and view an edition.
- **Weekly Jam** is treated as if it were a post: a compact card (blank author, the viewer's own track art as the thumbnail) appears in a fixed slot after all written posts — never interleaved by recency — on the Edition front page, the Editions listing preview, and the archive list. It shows each opted-in friend's auto-synced top track of the week (via Last.fm, art via Spotify) — passive participation for friends who never write a post. Clicking it opens a dedicated detail page (`/editions/[id]/jam`, mirroring the post reader's layout, read-only — no comments/likes) listing every visible friend's track. Same reveal-gated visibility as the posts above it; pre-publish, Coming Sunday shows only a static "N friends connected" count, not live track data. Full spec: [2026-08-04-weekly-jam-mvp.md](../specs/2026-08-04-weekly-jam-mvp.md).

### Post
A single weekly submission, scoped to one audience.

- Lifecycle: `DRAFT → SUBMITTED → PUBLISHED`, or `ARCHIVED` / `REMOVED` (moderation). One exception: during the Sunday live-join window, `DRAFT → PUBLISHED` directly, skipping `SUBMITTED` (see Edition above).
- Audience is chosen per post: `FRIENDS`, `CIRCLE` (+ a specific circle), or `ALL_USERS` — enforced admin-only server-side (`PUT /api/posts/[id]` rejects a non-admin setting `ALL_USERS`) and hidden from the audience picker for non-admins in the editor.
- **Temporal gate:** a `FRIENDS`-audience post is only visible to friends whose friendship predates the post going *live* (the edition's `publishedAt`), not the post's draft `createdAt` — a post drafted before a friendship began but published after is still visible. The same rule applies to `CIRCLE`-audience posts against circle-membership `joinedAt`. Adding a new friend or joining a circle does not retroactively expose the back-catalog published before that date. Its one sanctioned exception is **Republish** (below) — an author-initiated, per-recipient override of the gate, not a bypass of it. Full rules: [post-visibility-rules.md](../specs/2026-08-02-post-visibility-rules.md).
- A `SUBMITTED` (not-yet-published) post shows a title/thumbnail-only preview to its eligible audience immediately (no temporal gate — see the spec above), but full content stays author-only until it publishes.
- A content filter runs once, at the moment a post is submitted (`DRAFT → SUBMITTED`) — not on every autosave keystroke.
- Only the author can edit or delete their own post, at any status (there's no guard today preventing deletion of an already-published post).
- Comments/likes on a post you've blocked, or reported, are filtered out of your own view (comments/likes inherit their parent post's visibility rules).

#### Official posts (Editor's Note / Community Feature)
Admin-authored, first-party content published into the edition — an **Editor's Note** (creator commentary) or a **Community Feature** (spotlighting a real user post). Driven by `Post.officialKind` (`EDITORS_NOTE` | `COMMUNITY_FEATURE` | `null`), admin-only to set.

- Setting `officialKind` forces `audienceType = ALL_USERS` and hides the normal audience picker in the composer; a non-admin supplying `officialKind` is rejected server-side, same as `ALL_USERS` today.
- Authorship is **presentational only** — `authorId` stays the admin (so they keep edit/delete ownership and reply notifications), but the display name renders as **"Rogha"** with the app logo, is not a profile link, and suppresses the report/block overflow menu. This override lives in the shared author-render paths (`Frontpage.tsx`'s `getAuthorName`, the reader header, the Editions listing/archive), so it's consistent everywhere a post's author is shown.
- Official posts follow the **normal lifecycle and Sunday cadence** — no instant/mid-week publish — and are reveal-gated like any other post.
- They're pinned to the **bottom of the edition's post stack** (after friends'/circle posts, before the Weekly Jam card), on the edition front page, the Editions listing preview, and the archive list.
- They appear in **every user's Coming Sunday queue** while `SUBMITTED` (not just the admin's friends), via `getComingNext()`'s query.
- Comments/likes work normally; because the post is `ALL_USERS`, comments are visible to *all* users, same as any other `ALL_USERS` post.
- Titles follow a manual convention (not enforced by code): `Editor's Note {roman numeral}: {tagline}`, `Community Feature: {post name}`.
- Full spec: [2026-08-07-official-posts.md](../specs/2026-08-07-official-posts.md).

#### Republish
Gifting one of your own already-published posts to specific friends who joined after it published, and so can never see it under the temporal gate above.

- Recipients are picked **one at a time** from a reverse-temporal checklist: friends who currently *cannot* see the post (no select-all, no auto-send). `getRepublishEligibleFriends()` (`src/lib/access/postAccess.ts`) computes it by inverting the normal visibility check per friend; an `ALL_USERS` original has no eligible recipients (everyone can already see it).
- Confirming creates a **fresh `Post` instance** — `audienceType: RECIPIENTS`, scoped to a named `PostRecipient` list, `republishedFromPostId` pointing at the root original (chains flatten if you republish a republish). It copies the original's title/content/hero images, starts `SUBMITTED` (skipping `DRAFT`), and gets its own blank comment thread and likes — the original and its thread are untouched. An optional 500-char free-text note (`Post.republishMessage`) can accompany the send, rendered as its own callout above the post body when the recipient opens it.
- It rides the next Sunday cron exactly like a normal submitted post — no separate publish path.
- **One send per weekly cycle**, tracked as a queue-occupancy check rather than calendar-week math: unavailable iff you already have a republish instance sitting `SUBMITTED`, available again once the weekly cron promotes it to `PUBLISHED` — a multi-recipient send still spends the whole week's ration. No separate ration table; it's derived from existing `republishedFromPostId`-tagged posts (`src/lib/republish.ts`).
- Never re-branded — the byline stays the author's real name, with a "Republished · originally from [month year]" marker on the reader page.
- Surfaced three ways, converging on one single-step friend-picker dialog for a specific post (sorted most-recently-accepted friend first, so a nudge-triggered accept surfaces at the top without a separate pre-contexted flow): a one-time dismissible "republish is live" announcement (mirrors the profiles/usernames launch nudge, `localStorage`-dismissed); an optional prompt right after accepting a friend request (home page or `/circles`) that routes to the My Posts page (a permanent explainer card there describes the feature, no dedicated button); and a **Republish** action on any of your own published posts (reader page or each My Posts row) that opens the friend picker directly.
- Full spec: [2026-08-13-republish.md](../specs/2026-08-13-republish.md).

### Comments & likes
- Comments nest one level deep (top-level + one reply); the server rejects deeper nesting.
- Comments run the same content filter as posts, on creation.
- Only the comment author can edit or hard-delete it. Admin moderation removal is a separate, soft-delete path (`status: REMOVED`).
- Likes are unique per (user, post|comment); liking notifies the author (self-likes excluded).
- The reader surfaces a "since you last read this" freshness signal: a tappable "N new" pill in the post header, counting comments/replies added since the viewer's last `PostRead`. A first-time reader (no prior read) sees no pill — "everything is new" isn't useful signal. Alongside it, a generic floating button lets the reader jump between the post body and the comments regardless of new activity.
- After the comments section, the reader shows a "keep reading" block listing the other posts in the same edition (unread first, already-read tucked under a de-emphasized disclosure), or a "you're all caught up this week" state once nothing unread remains — since the edition reveal gate is edition-level, moving article-to-article costs nothing ritually.

### Notifications
Event types: `LIKE`, `COMMENT`, `SUBMIT`, `PUBLISH`, `FRIEND_REQUEST`, `FRIEND_REQUEST_ACCEPTED`.

- `SUBMIT` notifications fan out based on the post's audience: all accepted friends (`FRIENDS`), all joined circle members (`CIRCLE`), or nobody (`ALL_USERS` — deliberately silent). The one exception: an official post (`officialKind != null`) with the admin's opt-in `notifyAllUsers` checked fans `SUBMIT` out to every user, respecting each user's `NotificationPreference` — a launch-style broadcast, off by default. In-app, `SUBMIT` rows are deliberately non-clickable — "coming Sunday, blurred, queued" has nothing readable yet.
- `PUBLISH` fires when a post live-joins today's Sunday edition (see Edition above), instead of `SUBMIT`. Same audience resolution and the same `NotificationPreference` fields (`emailSubmissions`/`pushSubmissions`) as `SUBMIT` — it's not a separate preference category. Unlike `SUBMIT`, it's **clickable**, routing straight to the readable post in the live edition, because it's live right now rather than queued.
- Each user has independent, per-category toggles for in-app, email, and push delivery (`NotificationPreference`). A missing preference row defaults to everything enabled.
- In-app notification rows are always created; email/push are conditional on the user's preferences.

### Blocking & reporting
- **Block** is one-directional: it only changes what *you* see (the blocked user's content is filtered out of your editions/comments). It does not require mutual consent and doesn't necessarily hide your content from them. (The profile page is a documented exception — it hides itself from view if *either* side has blocked the other.)
- **Report** flags a post or comment for moderation and immediately hides it from the reporter's own view — it does not wait for admin action to do that. One report per user per item (idempotent).
- Full post-visibility rule set, including how block/report interact with audience/friendship/circle checks: [post-visibility-rules.md](../specs/2026-08-02-post-visibility-rules.md).
- Admins (Reports tab) can **Remove content** (soft-removes the underlying post/comment and marks the report `ACTIONED`) or **Dismiss** the report. Admins can also directly soft-remove any post or comment outside the report flow.

### Roles
- `User.role` is either `USER` or `ADMIN` (DB field). There's also a separate `ADMIN_EMAILS` env-var allowlist used specifically to gate the manual cron-trigger endpoint — these two admin checks are not the same mechanism and can drift; be aware of which one a given admin surface actually checks.
- Circles have no internal roles — membership is binary (joined or not).

### Home page (Buzz)
The signed-in home page orients a returning user in priority order and routes them to what they came back for. It replaced an earlier flat, reverse-chronological feed of individual `ActivityEvent`s. Top to bottom: **edition hero → Coming Sunday (nested in the hero) → New buzz → Earlier**.

- **Edition hero** — a single, always-present card for the latest published edition. Its state follows how much of that edition the viewer has read: *not opened* (reveal-moment card, day-dependent copy), *partially read* ("keep reading" with an N-of-M progress indicator, linking to the edition front page rather than a specific post), or *caught up* (quiet card, no CTA). Before any edition exists, it's a first-run invite instead.
- **Coming Sunday** — nested inside the hero, always present, with three states driven by the viewer's friend graph and this week's submissions: *no friends* (prompts the viewer to add friends, linking to Circles, since there's nothing to queue without a circle), *friends but nothing submitted yet* ("nothing yet" plus a "Start a post" CTA), and *posts queued* (lists submitted posts with titles visible but hero thumbnails blurred and a lock icon, and nudges the viewer to add their own before the reveal if they haven't).
- **Buzz** — everything below the hero, one row per post (never per event), ordered by most recent activity. **New buzz** is posts with unread activity; **Earlier** is the rest (capped, with "show more"). A post counts as unread when its latest *comment or reply* is newer than the last time the viewer opened it. Likes never count as activity, and newly submitted or published posts don't appear in Buzz at all — the hero owns new content, Buzz owns new conversation. Rows carry no actor names and no comment text; their only job is "is this worth opening?"

## Auth (summary)

Sign-in is Clerk-based. Web sign-in is standard Clerk. The native (iOS/Capacitor) app can't authenticate inline in its WebView, so it hands off to an in-app Safari browser at the app's own current origin, completes Clerk auth there, and deep-links back with a short-lived ticket that's exchanged for a session in the native WebView. Full detail, including why the flow is "origin-aware" (so a future staging build of the app can authenticate against staging instead of always bouncing to prod), is in [specs/origin-aware-signin.md](../specs/origin-aware-signin.md).
