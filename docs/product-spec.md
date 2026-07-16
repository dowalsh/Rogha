# Product Spec — Rogha

A reference for what Rogha does and how it's supposed to behave, independent of implementation. Read this before making a behavior-affecting change, and update it when behavior changes (see "When a feature is being finalized" in [CLAUDE.md](../CLAUDE.md)).

For *how* the code is organized, see [architecture.md](./architecture.md). For the entity/relationship detail behind these concepts, see [data-model.md](./data-model.md).

## What Rogha is

Rogha ("choice" in Irish) is a small, weekly social platform for friends. Tagline: "No ads. No noise. Actually social, in the way that matters."

The stated philosophy (from the in-app About page):
1. **Not always on** — no push-driven, infinite feed. Content is gated behind a weekly reveal.
2. **Constraints breed creativity** — a weekly cadence over constant posting; quality over quantity.
3. **Shared experience** — publishing is synchronized so everyone posts and reveals together ("buzz").
4. **Small audiences** — deliberately the opposite of platforms that "strive for scale," which the product philosophy holds "kills honesty and freedom of expression."

## Non-goals

- **No public feed for ordinary users.** Posts are visible only to friends or circle members. The `ALL_USERS` audience option exists in the schema but is admin-only by convention — regular users can't broadcast site-wide.
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
- Editions support a **reveal gate**: posts are hidden behind a blurred overlay ("N others already opened this week") until the viewer explicitly clicks to open it. This is a ritual/pacing mechanic, not a reciprocity gate — you do **not** need to have posted yourself to open and view an edition.

### Post
A single weekly submission, scoped to one audience.

- Lifecycle: `DRAFT → SUBMITTED → PUBLISHED`, or `ARCHIVED` / `REMOVED` (moderation).
- Audience is chosen per post: `FRIENDS`, `CIRCLE` (+ a specific circle), or `ALL_USERS` (admin-only in practice).
- **Temporal friend gate:** a `FRIENDS`-audience post is only visible to friends whose friendship predates the post's creation. Adding a new friend does not retroactively expose your back-catalog to them.
- A content filter runs once, at the moment a post is submitted (`DRAFT → SUBMITTED`) — not on every autosave keystroke.
- Only the author can edit or delete their own post, at any status (there's no guard today preventing deletion of an already-published post).
- Comments/likes/reports on a post you've blocked-or-been-blocked-by, or reported, are filtered out of your own view.

### Comments & likes
- Comments nest one level deep (top-level + one reply); the server rejects deeper nesting.
- Comments run the same content filter as posts, on creation.
- Only the comment author can edit or hard-delete it. Admin moderation removal is a separate, soft-delete path (`status: REMOVED`).
- Likes are unique per (user, post|comment); liking notifies the author (self-likes excluded).

### Notifications
Four event types: `LIKE`, `COMMENT`, `SUBMIT`, `FRIEND_REQUEST`.

- `SUBMIT` notifications fan out based on the post's audience: all accepted friends (`FRIENDS`), all joined circle members (`CIRCLE`), or nobody (`ALL_USERS` — deliberately silent).
- Each user has independent, per-category toggles for in-app, email, and push delivery (`NotificationPreference`). A missing preference row defaults to everything enabled.
- In-app notification rows are always created; email/push are conditional on the user's preferences.

### Blocking & reporting
- **Block** is one-directional: it only changes what *you* see (the blocked user's content is filtered out of your editions/comments). It does not require mutual consent and doesn't necessarily hide your content from them.
- **Report** flags a post or comment for moderation and immediately hides it from the reporter's own view — it does not wait for admin action to do that. One report per user per item (idempotent).
- Admins (Reports tab) can **Remove content** (soft-removes the underlying post/comment and marks the report `ACTIONED`) or **Dismiss** the report. Admins can also directly soft-remove any post or comment outside the report flow.

### Roles
- `User.role` is either `USER` or `ADMIN` (DB field). There's also a separate `ADMIN_EMAILS` env-var allowlist used specifically to gate the manual cron-trigger endpoint — these two admin checks are not the same mechanism and can drift; be aware of which one a given admin surface actually checks.
- Circles have no internal roles — membership is binary (joined or not).

## Auth (summary)

Sign-in is Clerk-based. Web sign-in is standard Clerk. The native (iOS/Capacitor) app can't authenticate inline in its WebView, so it hands off to an in-app Safari browser at the app's own current origin, completes Clerk auth there, and deep-links back with a short-lived ticket that's exchanged for a session in the native WebView. Full detail, including why the flow is "origin-aware" (so a future staging build of the app can authenticate against staging instead of always bouncing to prod), is in [specs/origin-aware-signin.md](./specs/origin-aware-signin.md).
