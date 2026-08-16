# Spec: Republish — gift an old post to a new friend

Status: **implemented (v1).** Builds directly on the temporal friend-gate from
[post-visibility-rules.md](./2026-08-02-post-visibility-rules.md): today a friend added
after a post published deliberately can't see it. Republish is the narrow, rationed,
author-initiated *exception* to that gate. The bet: a newcomer's first Sundays are thin,
and letting an established friend hand them a favourite from the back-catalogue makes that
first edition feel alive — without turning the weekly reveal into a rerun channel.

## Goal

Republish lets you take one of your own already-published posts and give it to specific
friends who — because they joined after it published — have never seen it. You pick the
people, one by one, from a list that can only contain friends the temporal gate is currently
hiding it from. The gift rides the next Sunday reveal like any other post: it sits blurred in
those friends' Coming Sunday queue and unlocks with the edition, clearly labelled as a
republish of something you made months ago.

The feeling is **pride offered as a present**. Not "here's my archive," but "I made this, I'm
proud of it, and I want *you* — this specific new person — to have it." The value to Rogha is
retention at the coldest moment: a new friend who lands on a warm, populated first edition
stays, and republish is how an existing member deliberately warms it. Crucially it does this
*with* the product's grain, not against it — it deepens the Sunday moment rather than adding a
new always-on surface, and it honours "small audiences, quality over quantity" by being rare
and hand-aimed. It is a considered gift, not a broadcast.

One boundary is worth stating up front because it shapes everything: **republish only ever
reaches people already on Rogha and already your friends.** It is a welcome/retention lever for
people who have already crossed the threshold — never an acquisition tool. It cannot pull
anyone onto the platform, and this spec does not try to make it.

## In scope

**One announcement, one dialog, no friend-first or post-first flow.** Users first hear about the
feature through a single dismissible "republish is live" announcement — the same one-time
announcement pattern as the existing profiles/usernames launch nudge, shown once per user on
sign-in purely to put it on their radar. It is awareness, not a call to action: dismissed once,
gone for good. From there, every real entry point opens the *same* single-step friend-picker
dialog for a specific, already-known post — there is no "pick a post first" or "pick a friend
first" mode to keep in sync. The **Republish** action lives on any of your own published posts —
the reader page and each row on the My Posts page — and opens the dialog directly. The friend-
accept nudge (a gentle, dismissible prompt right after accepting a new friend, on the home page or
`/circles`: "Share one of your old posts with [name] to kickstart your rogha friendship?") doesn't
open a dialog at all — taking it just routes to the My Posts page, where a permanent explainer
card describes the feature and the per-post Republish action is what you'd click next. The friend
picker sorts eligible friends by most-recently-accepted first, so a friend you just added surfaces
at the top on its own — no separate pre-highlighting logic needed anywhere. That is the whole of
v1's surfacing — anything that *recurs* or *chases* the user is deliberately held for later (see
"Later, not now").

**The recipient checklist is the flow, and the friction is the feature.** Choosing Republish
opens a list of friends who have *not* seen this post — precisely the reverse of the temporal
gate: friends whose friendship postdates the post's publication, **ordered most-recently-accepted
first** so a friend you just added is easy to find without any special pre-selected treatment.
You select recipients **one at a time**. There is no "select all," no pre-checked default. The
deliberate act of naming each person is what keeps this a gift rather than a blast.

**It rides Sunday.** A republish does not appear the instant you send it. It joins the chosen
recipients' next weekly edition: it shows in their Coming Sunday queue (title visible,
thumbnail blurred, marked as a republish) and unlocks at the reveal with everything else. The
gift becomes part of the ritual instead of a mid-week ping.

**It is honestly labelled and stays yours.** When a recipient opens it, it reads as a normal
post authored by *you*, under *your* name — carrying a clear "Republished · originally from
[month year]" marker so it is never mistaken for something new. (This is the opposite of
official posts, which re-brand as "Rogha"; a republish is emphatically still you.)

**It arrives as a fresh gift.** The republish is a clean instance of the post, not a window
onto the original. It carries the same body and hero image but its **own blank comment
thread** — the recipient doesn't open a gift pre-cluttered with months of conversation between
people they've never met. They can like and comment on it, and that engagement lives entirely
on the republish, scoped to its audience (you and the recipients). The original post and its
thread, over in their old edition, are untouched.

**An optional note travels with it.** At send time, the friend-picker dialog offers an optional
free-text field — "Optional republish message to accompany your post" (500 characters, plain
text) — for a short line of context on *why* you're sending this one to them now. If set, it
renders as its own small callout ("Republish note") above the post body when the recipient
opens it at the reveal, distinct from the post content itself. It's stored on the republish
instance (`Post.republishMessage`), not the original, so it's naturally scoped per-send the same
way everything else about a republish instance is.

**One per week, full stop.** You get a single republish per weekly cycle. Sending one post to
five newly-joined friends is one considered act that spends your whole week's ration — the
group is the gift, the ration is the discipline.

## Explicitly out (deliberately, for v1)

- **No broadcast, no select-all, no auto-send.** Recipients are always named individually. The
  moment this becomes "share with everyone who missed it," it's the back-catalogue spam we
  designed it to avoid — that's the whole reason for the one-by-one checklist.
- **No re-run to people who already saw it.** Friends who saw the original when it first
  published get nothing — no re-surfacing, no "new activity" ping on an old post. The
  reverse-temporal checklist makes them un-selectable by construction.
- **No instant / mid-week appearance.** "Not always on" is Rogha's first principle. A republish
  waits for Sunday like every other post.
- **No acquisition.** Republish can't reach anyone who isn't already a friend on Rogha. It is
  not an invite, and it doesn't try to be.
- **No republishing someone else's post.** You can only gift your own published work — pride is
  the engine, and you can't be proud of what you didn't make. (Any post you authored *and*
  published is fair game, whatever its original audience; eligibility is decided per-recipient,
  not per-post — see Rules & edges.)
- **No re-branding.** It stays your post under your name. It is not official/"Rogha" content.
- **More than one a week.** A group send is still one republish. No exceptions, no top-ups.

## States & behaviour

**Feature-live announcement.** On sign-in, a one-time dismissible banner tells the user
republishing exists ("You can now share old posts with new friends! Just hit Republish on any of
your posts"). It follows the existing announcement-nudge behaviour exactly — shown until dismissed,
never shown again after. Dismissal is `localStorage`-based, same as the profiles/usernames launch
nudge it mirrors — a deliberate v1 scope call to reuse that stopgap rather than build the
not-yet-implemented cross-device `NudgeDismissal` framework (see
[2026-07-28-nudges-framework.md](./2026-07-28-nudges-framework.md)) just for this one banner; it
reappears on a new device/browser until dismissed there too, same known gap as today's
profiles/usernames nudge. It's the same low-stakes, one-at-a-time surface the profiles launch
used; it does not nag and carries no ongoing state.

**Friend-accept nudge.** Right after you accept a new friend, an optional, dismissible prompt:
"Share one of your old posts with [name] to kickstart your rogha friendship?" Dismissing it costs
nothing and it never nags. Taking it routes to the My Posts page — no friend-pre-contexted modal;
the friend picker's most-recently-accepted-first ordering (see above) is what actually surfaces
that friend, not a special flow. Fires from both places a friend request can be accepted: the
home page and `/circles`.

**Recipient checklist — populated.** A list of friends who haven't seen this post, ordered
most-recently-accepted first. You tap to add each one. A running sense of who's included; a
clear confirm. Intro copy: "Who should this post be republished to? Choose from the friends
below who haven't seen this one yet."

**Recipient checklist — nobody eligible.** If every friend has already seen this post (or you
have no friends who joined after it), the Republish dialog says so plainly instead of showing an
empty picker: "Everyone you're friends with has already seen this post!"

**Ration already spent.** If you've used your republish this cycle, the dialog says so plainly
instead of showing an empty picker: "You've already republished this week! (you only get one per
week)" — and the same check re-runs server-side at confirm time with equivalent copy, in case the
client's view was stale. Never a silent no-op.

**Success / confirmation.** After sending, the same toast as a normal post submit — "Submitted"
(or "Submitted [signoff emoji]" if the author has one set) — since a republish is a submit under
the hood. Your own Coming Sunday reflects it back to you so the gift feels sent, not swallowed
("You republished '[title]' to N friends").

**Recipient's experience.** The republish appears in their Coming Sunday (title visible,
thumbnail blurred, a small "Republished" hint), then unlocks at the reveal as a normal,
readable post under your name with the "originally from [month year]" marker, opening on a
**blank thread** they can like and reply to. It stays put in *that* edition permanently, so
they can return to it there any time — it doesn't age out after the reveal week. Their first
real edition is fuller *because someone chose to give them something* — that's the emotional
beat.

**Bad-actor / abuse.** The natural guards do most of the work: one per week caps volume, the
reverse-temporal checklist means you can never re-send something a person has already seen, and
normal block/report still applies — if a recipient blocks you, the republished post disappears
from their view exactly like any other post of yours. Republish grants no power that ordinary
posting doesn't already grant, on a tighter leash.

## Rules & edges

- **Eligibility is "friends who can't currently see it."** A friend can be a recipient only if
  they would be *unable* to see the post under today's visibility rules — most often because
  their friendship postdates its publication (the reverse of the temporal gate), but the same
  test naturally covers a friend outside a circle-scoped post, and quietly empties the list for
  an `ALL_USERS` post everyone can already see. Republish is the hand-made exception to that gate,
  granted per person, per post.
- **Any post you authored and published** is republishable, regardless of its original audience.
  Not drafts, not submitted-but-unpublished posts, not removed/archived ones, not other people's
  posts.
- **A republish is a fresh instance living in the edition it's sent into.** It does not move or
  alter the original. It has its own blank comment thread and its own likes, and its permanent
  home is *this* Sunday's edition — that's where recipients revisit it, not the original's old
  edition. Because it's a separate instance, recipient engagement is structurally incapable of
  leaking back to the original's audience — the no-bleed promise is kept by construction, not by
  a filter we have to remember to apply.
- **Recipients see it, nobody else's view changes.** The republished instance is visible only to
  its named recipients (and you). It does not re-enter the feed of the friends who saw the
  original, and it does not appear to the recipients' *other* friends — it composes with Rogha's
  existing per-post audience scoping (an edition already holds posts visible to different subsets;
  this is just an instance with a bespoke recipient list).
- **The ration is one send per weekly cycle**, but tracked as a queue-occupancy check rather than
  a calendar-week computation: unavailable iff you already have a republish instance sitting
  `SUBMITTED`, available again the instant the weekly cron promotes it to `PUBLISHED` (see
  `hasRepublishRationAvailable`, `src/lib/republish.ts`). No week-boundary math, no timezone
  dependency, no free-floating 7-day timer — since a submitted post only ever clears via that same
  weekly cron, this lands in exactly the same weekly rhythm without needing to reason about it
  explicitly.

## Open questions

All five drafting-stage questions are now **decided** and either folded into the body above or
resolved here: a republish is a *fresh instance with its own blank thread* (not a window onto the
original); recipients *can comment and like*, scoped to the republish; it's *permanent, living in
the edition it was sent into*; *any post you authored and published* is republishable; and:

- **Re-gifting the same post over time.** Resolved as **allowed, each send is its own instance**
  — if you republish a post this week, then next month want to give it to a different new friend,
  that's a second send in a second edition, a new fresh instance with its own thread. This falls
  out naturally from "one per week" + "lives in the edition it's sent into," and needed no extra
  schema: `republishedFromPostId` always points at the root original (chains flatten), so any
  number of sibling instances can coexist without needing to know about each other.
- **What the author sees on the original.** Resolved as **skipped for v1** — no author-only
  "you've republished this" indicator. Revisit if losing track of past sends in practice turns out
  to matter; the data (`Post.republishInstances`) is already there to build it on later without a
  migration.

## Later, not now

- **Group/circle as a recipient primitive** — gifting to a named group in one tap. Deliberately
  deferred: the one-by-one pick is a v1 *feature*, and a group primitive is exactly the pressure
  that would erode it. Revisit only if the manual pick proves genuinely painful at real cluster
  sizes, and even then with the anti-broadcast guard intact.
- **Intermittent "opportunity" nudges (V2).** A recurring in-app nudge that resurfaces a
  *standing* gift opportunity — "friends have joined since you last shared an old post; want to
  give one of them something?" — for the times the friend-accept moment passed without action.
  Deliberately out of v1 because it needs care we don't want to rush, and we've already worked out
  the guardrails so V2 doesn't re-derive them: it must be **in-app only, never push/email** (a
  push to resurface old content is the exact "always on" behaviour Rogha rejects); **state-driven,
  never timer-driven** (it appears only when there's a real, specific gift to make — unspent
  ration *and* friends who genuinely can't see a post — and is absent otherwise, never a "it's
  been a while" streak-nag); it **points at the opportunity, not a ranked pick** (the app must not
  choose your "best" post — that's the recommendation algorithm the product refuses to have; it
  surfaces that a gift is possible and hands you to the picker); and it needs a **cooldown/snooze**
  the current nudges framework lacks (announcements dismiss-once, state nudges auto-resolve; a
  standing opportunity would otherwise show every session), backing off further each time it's
  dismissed unacted.
- **Suggested picks** ("posts [name] would love," "your most-read post") — helpful, but adds an
  algorithmic nudge to a product that prides itself on having none. Not for v1 (and folded into
  the V2 nudge's "points at the opportunity, not a ranked pick" guardrail above).
- **Rolling the fresh instances back up** — if a post gets gifted as several separate instances
  across editions, a future view might gather them (and their threads) in one place for the
  author. Only worth it if the scattering actually bothers anyone.
- **A larger or flexible ration** — only if scarcity proves too tight in practice. Loosening is
  easy later; it's the one dial we can turn up without redesigning anything, so start stingy.
- **Republish as part of an invite/onboarding flow** — the acquisition-side companion (queue a
  gift to someone you're inviting, delivered once they join). A different feature with a different
  spec; noted so the retention/acquisition line stays clean.
- **Re-gifting** — a recipient forwarding your republished post onward. Out for now; it muddies
  authorship and audience.

## Docs to update when this ships

- [product-spec.md](../reference/product-spec.md) — the Post section (republish behaviour,
  labelling, one-per-week ration) and the temporal-gate description (republish is now its
  sanctioned, author-initiated exception).
- [post-visibility-rules.md](./2026-08-02-post-visibility-rules.md) — the reverse-temporal
  eligibility check and how a republished post's visibility is scoped to named recipients.
