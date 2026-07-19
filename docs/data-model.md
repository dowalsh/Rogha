# Data Model — Rogha

Entity/relationship reference. Source of truth is always [`prisma/schema.prisma`](../prisma/schema.prisma) — this doc explains what the fields mean, not a copy of the schema. For the behavior these entities drive, see [product-spec.md](./product-spec.md).

## Core entities

**User** — `email`, `username` (unique), `clerkId` (unique, links to Clerk). `role: USER | ADMIN`. Fans out to nearly everything else: posts, comments, likes, notifications (sent + received), friendships, circle memberships, notification preferences (1:1), push devices, reports filed, blocks given/received.

**Friendship** — composite PK `(aId, bId)`, stored as a canonical ordered pair (`aId < bId`) so each pair has exactly one row regardless of who requested. `requesterId` tracks who initiated. `status: PENDING | ACCEPTED`, `acceptedAt` stamped on accept — this timestamp drives the temporal friend-visibility gate on posts (see product-spec).

**Circle** — `name`, `description`. Has many `CircleMember` and posts (via `PostCircle`).

**CircleMember** — composite PK `(circleId, userId)`. `status: JOINED | PENDING | REMOVED | LEFT`. Note: `PENDING` is reserved for a future approval flow and isn't currently used — membership today is either `JOINED` or not. No role field; all members are equal.

**Edition** — one row per calendar week. `weekStart` (Monday 00:00 UTC, unique), `publishedAt` (nullable — set on first publish), `title`. Has many `Post` and `EditionView`.

**EditionView** — composite PK `(editionId, userId)`, `openedAt`. Records that a user clicked through the reveal overlay for that edition; also powers the "N others already opened this week" social-proof text.

**PostRead** — composite PK `(postId, userId)`, `readAt`. Per-post read tracking, stamped when a user opens a post's reader (mirrors `EditionView`'s pattern one level down). Absence of a row means unread — no backfill was done when this was introduced, so pre-existing posts simply start unread under the new system. Powers the home page's per-edition read progress and the New buzz / Earlier split — see [specs/home-page-redesign.md](./specs/home-page-redesign.md).

**Post** — `status: DRAFT | SUBMITTED | PUBLISHED | ARCHIVED | REMOVED`. `version` (int) for optimistic-concurrency on autosave. `audienceType: CIRCLE | FRIENDS | ALL_USERS` (default `FRIENDS`; `ALL_USERS` is admin-only by convention, not DB enforcement), with `circleId` set when `CIRCLE`. Hero image fields (`heroImageUrl`, `heroThumbUrl`, `heroThumbBlurUrl`); the legacy `image` field is deprecated — do not use. Public share fields (`publicShareToken`, `publicShareEnabled`, `publicShareCreatedAt`) back unauthenticated share links.

**Comment** — `status: ACTIVE | REMOVED`. One level of self-referential nesting via `parentCommentId` / `replies` (server enforces max depth 2 — top-level + one reply).

**PostLike** / **CommentLike** — join tables, unique on `(userId, postId)` / `(userId, commentId)`.

**Follows** — `followerId` / `followingId` composite PK. Present in the schema but no application code currently reads or writes it — treat as legacy/dead; `Friendship` is the real social-graph primitive. Don't build new features on `Follows` without first confirming this is still true.

**Notification** — `type: LIKE | COMMENT | SUBMIT | FRIEND_REQUEST`, `read` boolean. Links `userId` (recipient), `creatorId` (actor), and optionally `postId` / `commentId`.

**NotificationPreference** — 1:1 with User. Master switches (`emailEnabled`, `pushEnabled`) plus per-category toggles for comments, replies, submissions, and friend requests, each split by channel. A missing row defaults to everything enabled (`?? true` fallback in code) — don't assume a row always exists.

**PushDevice** — registered web/mobile push token, `enabled` flag.

**Report** — `contentType: POST | COMMENT`, `status: PENDING | ACTIONED | DISMISSED`. Unique on `(contentType, contentId, reporterId)` — one report per user per item.

**Block** — composite PK `(blockerId, blockedId)`. One-directional.

**ActivityEvent** — `eventType: POST_LIKED | COMMENT_LIKED | POST_COMMENTED | COMMENT_REPLIED | POST_SUBMITTED | POST_PUBLISHED`. An audit/activity log tied to actor + post (+ comment where relevant). Backs the home page's Buzz list (`src/lib/home.ts`), which aggregates `POST_COMMENTED`/`COMMENT_REPLIED` events per post into a de-duplicated, per-post feed — see [specs/home-page-redesign.md](./specs/home-page-redesign.md).

## Notable modeling decisions worth knowing before changing them

- **Friendship's canonical-pair storage** means lookups/writes must always normalize `(aId, bId)` via the ordering helper rather than querying with the pair in arbitrary order — see `src/lib/friends.ts`.
- **The temporal friend gate** relies on `Friendship.acceptedAt` being set only once, at acceptance — don't repurpose or overwrite this field for other timestamps.
- **`CircleMember.status = PENDING`** exists but is unused; if you're adding a circle-join-approval feature, this is likely the field to build on rather than adding a new one.
- **`Follows` is dead code in the schema.** Don't assume it backs anything live.
