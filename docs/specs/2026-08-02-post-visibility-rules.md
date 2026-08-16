# Spec: Post visibility rules

Status: **implemented** — this documents the rules enforced by
[`src/lib/access/postAccess.ts`](../../src/lib/access/postAccess.ts), which is
the single authority for "can viewer V see post P." Every post-reading code
path (routes, server actions, feed builders) is expected to call into it
rather than re-deriving any subset of these rules independently.

For the underlying concepts, see [product-spec.md](../reference/product-spec.md)
(Post, Friendship, Circle, Blocking, Reporting) and
[data-model.md](../reference/data-model.md).

## Background

This spec was written after a security/privacy audit found that post
visibility logic had drifted: six different functions across the codebase
each independently re-implemented some subset of "who can see this post,"
and none of them implemented the full rule set. That's what produced the bugs
this pass fixed — a friend added after a post was drafted (but before it
published) losing access on publish, circle membership granting retroactive
access to a circle's entire history with no equivalent temporal gate, comment
threads leaking via a friendship with the *commenter* instead of a check
against the post itself, and block/report exclusion existing in some read
paths but not others. The fix consolidates all of it into one place.

## Inputs to the decision

- `viewerId` (nullable — null means anonymous)
- `post.status`: `DRAFT | SUBMITTED | PUBLISHED | ARCHIVED | REMOVED`
- `post.audienceType`: `ALL_USERS | FRIENDS | CIRCLE | RECIPIENTS`
- `post.circleId` (when `CIRCLE`)
- `post.authorId`
- `post.edition.publishedAt` (null until the post's edition has published)
- viewer↔author `Friendship` (status, `acceptedAt`)
- viewer's `CircleMember` row for `post.circleId` (status, `joinedAt`)
- a `Block` row from the viewer against the author (one-directional)
- a `Report` row from the viewer against this specific post
- viewer's `PostRecipient` row for the post (when `RECIPIENTS` — see
  "Republish" below)

## Rules, evaluated in this order (first match wins)

1. **Removed** — `status === REMOVED` → invisible to everyone, no exceptions
   (including the author). *(Open question: should the author be an exception,
   e.g. to see their own removed post in an editor with a "removed" banner?
   Current behavior says no; revisit if that UX is ever wanted.)*
2. **Blocked** — if the viewer has blocked the author, the post is invisible
   regardless of every other rule. **One-directional**, matching
   [product-spec.md](../reference/product-spec.md)'s "Blocking & reporting"
   section: blocking someone filters their content out of *your* view; it
   does not hide your content from them (that would require them to block you
   too). The profile page (`src/actions/profile.action.ts`) separately hides
   itself from view if *either* side has blocked the other — a distinct,
   intentionally broader UX decision scoped to that one route, not a
   post-visibility rule.
3. **Reported** — if the viewer has reported this specific post, it's
   invisible to that viewer only; doesn't affect other viewers.
4. **Author** — `viewerId === post.authorId` → always visible, full content,
   any status (except rule 1).
5. **Draft / Archived** (`status === DRAFT` or `ARCHIVED`) — invisible to
   everyone but the author. *(`ARCHIVED` is defined in the schema but never
   set by any code path today; treated the same as `DRAFT` as the
   conservative default. Confirm intended semantics with product before it's
   ever wired up.)*
6. **Submitted** (`status === SUBMITTED`, not yet published):
   - Full content (single-post read) — author only, same as Draft.
   - **Lightweight preview only** (title, thumbnail, author name — never the
     body) is visible to any viewer who passes the audience test in rule 7,
     but **with no temporal gate** — a friend added minutes ago sees a
     friend's submitted-for-next-edition preview immediately, since there's
     no "old" content yet to guard against. This is intentionally asymmetric
     with rule 7, and is what powers the "Coming Sunday" section
     (`getComingNext` in `src/lib/home.ts`).
7. **Published** (`status === PUBLISHED`) — visible if the viewer passes the
   audience test:
   - `ALL_USERS` → everyone, including anonymous.
   - `FRIENDS` → viewer has an `ACCEPTED` friendship with the author **and**
     `friendship.acceptedAt <= post.edition.publishedAt`.
   - `CIRCLE` → viewer has a `JOINED` `CircleMember` row for `post.circleId`
     **and** `circleMember.joinedAt <= post.edition.publishedAt`.
   - `RECIPIENTS` → viewer has a `PostRecipient` row for this post. **No
     temporal comparison** — unlike `FRIENDS`/`CIRCLE`, the named recipient
     list *is* the visibility boundary; it was already the point of a
     Republish send (see below), so there's nothing further to gate on.
   - The date comparison guards against a newly added friend/circle-member
     seeing the group's entire back-catalog, without hiding content that was
     already visible to them continuously since before it published. It's
     gated on the *edition's* publish date, not the post's `createdAt` (draft
     creation time) — a post drafted long before a friendship/membership
     began, but published after, should still be visible.
8. **Derived surfaces inherit post visibility** — comments, replies, and
   likes on a post are visible **if and only if** the parent post is visible
   per rules 1–7 to that viewer. There is no independent "are you friends
   with the commenter/liker" check — that relationship is irrelevant to
   whether you may see content attached to a post you can't see.
9. **Admin bypass** — admin-only routes (gated by `requireAdmin()`) may see
   any post in any state, but only through dedicated `/api/admin/*` routes,
   never through general viewer-facing routes/actions.

## Republish — the gate's one sanctioned exception

Republish ([2026-08-13-republish.md](./2026-08-13-republish.md)) lets an
author manually grant access to friends rule 7's `FRIENDS`/`CIRCLE` temporal
check would otherwise exclude — but it does this by creating a **new post**
scoped to `audienceType: RECIPIENTS`, not by punching a hole in the gate
itself. The original post's visibility is completely unaffected.

- **Eligibility** (who can be picked as a recipient) is the *inverse* of this
  spec's own rules: `getRepublishEligibleFriends()`
  (`src/lib/access/postAccess.ts`) runs each of the author's accepted friends
  through `canViewPostPolicy` against the original post and keeps only the
  ones it returns `false` for — i.e. friends the gate is currently hiding it
  from. An `ALL_USERS` original has no eligible recipients (rule 7 already
  shows it to everyone); blocked pairs (either direction) are excluded
  regardless of what the gate would otherwise say.
- **Scoping the new instance** uses the same `buildAudienceCandidateWhere`
  DB-level builder as the other audiences, extended with a
  `recipientPostIds` branch (postIds the viewer has a `PostRecipient` row
  for, fetched via `getRecipientPostIds(userId)`), and the same
  `canViewPostPolicy` function for the exact per-post check.

## Implementation

- `src/lib/access/postAccess.ts` is the single authority: `canViewPostPolicy`
  (pure function, all 9 rules), `resolveVisiblePosts` (batch resolver — fetches
  friendships, circle memberships, blocks, and reports once per call and
  filters a list of candidate posts), `canViewPost`/`requirePostAccess`
  (single-post wrappers).
- `buildAudienceCandidateWhere(userId, friendIds, circleIds)` is a shared
  Prisma `OR`-clause builder for the *audience* half of rule 7 (self /
  `ALL_USERS` / `FRIENDS`-with-friend / `CIRCLE`-with-member), used for cheap
  DB-level candidate filtering before the exact rules run. It intentionally
  does **not** express the temporal/block/report checks — those still need to
  run through `resolveVisiblePosts` after fetching. New feed/list queries
  should use this builder rather than hand-writing the `OR` clause, so a
  future query can't silently omit an audience branch.
- The temporal comparisons (friendship/circle-join date vs. publish date) are
  deliberately done as an in-memory filter after a DB fetch, not pushed into
  the SQL `WHERE` as a per-friend/per-circle threshold — see the performance
  note below.

## Performance notes

- Block/report exclusion adds 1–2 batched queries per `resolveVisiblePosts`
  call (blocked-user-ids, reported-post-ids), on top of the existing
  friendship/circle-membership batch queries — O(1) extra round-trips per
  request, not O(n) with post count.
- Deliberately **not** pushing the temporal comparison into the SQL `WHERE`
  clause as a per-friend/per-circle `OR` of individual date thresholds — that
  would make query size scale with friend/circle-membership count. Keeping it
  as a post-fetch in-memory filter trades a slightly larger candidate set for
  a flat, cheap query shape regardless of friend count.
- No new indexes were added; if query plans on `Friendship`, `CircleMember`,
  `Block`, or `Report` ever look slow, verify existing indexes cover the
  `userId`/`status` and `blockerId`/`blockedId` lookup patterns before
  reaching for a new one.
