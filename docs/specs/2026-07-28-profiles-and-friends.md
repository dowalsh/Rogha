# Spec: Profiles & Friends

Status: **design / UX** — this defines the intended experience and behaviour.
Implementation detail (routes, components, schema migrations) is deliberately
out of scope for this pass; the "Data model touch points" section only flags
the known ripples so they aren't a surprise later.

For the concepts this builds on, see [product-spec.md](../reference/product-spec.md)
(Friendship, Circle, Post, Notifications, Blocking) and
[data-model.md](../reference/data-model.md).

## Goal

Give people a **recognizable, findable identity** in Rogha so that friending
someone no longer depends on knowing their email, and a friend is a *person*
(name, face, profile) rather than an invisible node in a visibility graph.

The social graph itself — mutual friendship, request/accept, circles, the
temporal visibility gate — **already exists and is unchanged**. This work adds
the identity and discovery layer on top of it, and fixes the request flow,
which is currently too hidden.

Three jobs: be **findable** (username), be **recognizable** (avatar), be
**viewable** (profile). Everything is deliberately small — no username search,
no directory, no scale mechanics. That's consistent with Rogha's "small
audiences / no discoverability" philosophy.

## Identity: username

- Every user has a **single username that is both handle and display name** —
  one identity, shown everywhere a person appears (posts, comments, requests,
  profiles).
- **Unique.** Letters, numbers, and underscore only; a sensible character
  limit. Matching and uniqueness are **case-insensitive** (`John` cannot
  coexist with `john`), but the casing the user typed is preserved for display.
- **Changeable at any time** from your own profile. A freed-up username may be
  reclaimed by others — accepted, we're not guarding against it.
- **Existing users are backfilled** with a default username derived from their
  email local-part, **sanitized** to the allowed character set and **deduped**
  with a numeric suffix on collision (`john`, `john2`). Because that handle is
  now public-facing, surface a gentle, non-blocking nudge on next visit — "this
  is your username, tap to change it" — so nobody is stuck displayed as a
  mangled email fragment without realizing they can fix it.
- **New signups** pick a username as a required step.

## Identity: avatar

- **Uploadable image**, visible to **everyone** (friends and non-friends
  alike). Exposure is bounded because there's no browse/search — you only reach
  a profile via a mutual, an exact-handle match, or an actual friendship — so
  we accept the risk in exchange for personality and recognizability.
- Default before upload is a **generated avatar** (e.g. initials), so identity
  is never blank.
- Because uploaded images bypass the (text-only) content filter, every profile
  carries a **report-user** action (see Reporting) as the safety valve, rather
  than pre-moderation.

## Adding a friend

- A single input accepts an **exact username _or_ an email**. No search, no
  autocomplete, no browse — you can only add someone whose handle or email you
  already know.
- Sending creates a **PENDING** request and fires a `FRIEND_REQUEST`
  notification to the target.
- Guards: you can't request yourself, someone you're already friends with, or
  someone with an outstanding request — a repeat attempt simply reports the
  request as already outstanding (idempotent; no second notification, no cancel
  needed).
- You **cannot** request (and can't be requested by) a user you've blocked or
  who has blocked you (see Blocking).

## The request flow (the fix)

Today a friend request is effectively hidden on a Friends page nobody visits.
A relational, actionable event should come *to* the user. Three layers of
visibility, using surfaces that already exist:

1. **Pinned to the top of the home page.** Above the edition hero and Buzz
   list, a pending request renders as a card showing **username + avatar +
   mutual-friend count**, with **inline Accept / Decline**. Multiple pending
   requests stack ("3 people want to connect"). This is the primary,
   unmissable surface — the request lands on the one screen everyone opens.
2. **A persistent nav badge.** A count on the Friends nav item, visible from
   anywhere in the app.
3. **The existing notification channels.** `FRIEND_REQUEST` already supports
   in-app / email / push per user preference; this work just ensures tapping
   the notification lands somewhere actionable, not a dead end.

On the home card, show enough to decide in place (avatar, username, mutual
count, inline actions), with **tap-through to the full profile** when the user
wants more before deciding.

**Accept** → friendship becomes `ACCEPTED` and `acceptedAt` is stamped — this
is the exact moment the new friend begins to see your *future* posts (the
temporal gate is unchanged; your back-catalogue is never retroactively
exposed). It also fires a **new "request accepted" notification back to the
requester**, so the loop closes and they know to go read the new friend's
posts.

**Decline** → clears the pending request (back to no relationship). The
requester may request again; there is no cooldown. If requests become
unwanted, the remedy is to open the requester's profile and **block** them —
that is the harassment control, not a rate limit.

## Profiles

Every profile is reachable by tapping a person's **name or avatar** anywhere
they appear — a post, a comment, your friends list, a request card.

**Your own profile.** One page that is both your real profile view and your
edit surface: shows your username, avatar, and your posts, with inline controls
to **change your username** and **upload/replace your avatar**. No separate
"preview as a friend" mode. Reachable from a clear, dedicated entry point (a
"me" avatar in the nav / a Profile row in settings).

**A friend's profile.** Username, avatar, and **their posts** — rendered
through the *same* audience + temporal rules that gate those posts everywhere
else (a `FRIENDS` post only if your friendship predates it; a `CIRCLE` post
only if you're in that circle). The profile is a per-author view onto content
you can already see; it introduces **no new visibility logic**. Also offers
**remove-friend** (also available from the Friends tab).

**A non-friend's / stranger's profile.** Deliberately thin: username, avatar,
**mutual-friend count as a number only** (never the names — that would leak
your graph), and a single relationship button reflecting current state —
**Add friend**, **Request pending**, or **Accept** (if they've requested you).
No posts.

Every profile (friend or not) carries a **report-user** action.

## Friends tab

The management home for the graph (distinct from the home-page request card,
which is about *discovery*, not management):

- Your **friends list**.
- **Pending requests** — incoming (accept/decline) and outgoing (shown as
  awaiting; no cancel).
- **Remove friend.**

Removing a friend does **not** touch shared circle membership — circles and
friendship are independent (any circle member could have added the person, not
just you), so an ended friendship leaves circle membership as-is.

## Blocking & reporting

- **Blocking** (already one-directional and content-filtering) gains two
  responsibilities in this update: a blocked relationship **hides your profile
  from them and prevents friend requests in both directions**. This is the
  safety counterpart to report-user — without it, report/block wouldn't stop
  request spam.
- **Report-user** flags a user (most importantly their avatar) for admin
  review, from any profile. This extends reporting beyond posts/comments to a
  user target.

## Out of scope (explicitly)

- Username **search / discovery / directory** — you can only add by exact
  handle or email.
- **Avatar moderation** beyond report-user (no pre-upload filtering).
- **Bios** or profile fields beyond username + avatar.
- **Cancelling** an outgoing request; request **cooldowns**; guarding **freed
  usernames** against reclaim.
- Any change to **circles**, the **temporal gate**, or the **edition/reveal**
  mechanics.

## On completion (lifecycle)

This spec is a **working document for an in-flight change**, not a
source of truth. When the feature ships:

1. **Fold the durable behaviour into the long-term docs** — Friendship,
   Profiles, Blocking, and Notifications sections of
   [product-spec.md](../reference/product-spec.md); the `Report` `USER` target, avatar
   storage, and "request accepted" notification into
   [data-model.md](../reference/data-model.md).
2. **Then delete this spec** (or archive it — see docs structure convention),
   so it can't drift out of sync with the shipped behaviour.

The long-term docs are canonical; this file is disposable.

## Data model touch points (flags, not a design)

Called out only so they're not a surprise at build time:

- **`User.username`** already exists and is unique — the backfill, casing, and
  change flow build on it.
- **Avatar** needs a stored image + generated-default fallback; the existing
  hero-image pipeline (`heroImageUrl` / thumb / blur on `Post`) is the obvious
  pattern to reuse.
- **`Report`** currently targets `POST | COMMENT` only — **report-user** adds a
  new `USER` content target.
- **Notifications** — `FRIEND_REQUEST` exists; the **"request accepted"**
  message to the requester is a new event to fan out (reuse the friend-request
  category or add one).
- **Blocking** — the profile-hiding and request-prevention behaviour is new
  logic layered on the existing one-directional `Block`.
- **`Friendship.acceptedAt`** and the temporal gate are **unchanged** — accept
  stamps it exactly as today.
