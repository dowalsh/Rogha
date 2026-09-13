# Spec: Multi-Circle Sharing - post to several circles at once, into one shared room

Status: **draft.** Builds on the Tier 0 shift toward a circle-first graph with assisted friendship (see the Tier 0 decision brief). Prompted by the recurring pain of writing the same post several times to reach overlapping-but-distinct audiences. The bet: making the circle the primary, multi-select audience - published once, into one shared room, with an honest per-reader visibility label - is both the heart of circle-first sharing and a straight upgrade over posting N times. Updated 2026-09-12 to fold in the UI design session, which resolves the share-moment display and overrides two earlier behaviour calls (noted inline).

## Goal

When composing, the author chooses one or more circles as the audience (or, still, "All Friends"). The post publishes **once** to the union of those circles' members, and everyone who receives it shares a **single** comment-and-like thread. Each reader is shown which of *their own* circles the post reached.

The value is concrete: it kills the "write it three times so my sister doesn't see it" workaround, which today forces authors to either over-share or do manual busywork, and it makes the circle - not the friend - the thing you actually address when you sit down to write. That is the core loop of a circle-first Rogha.

There are two feelings to protect. For the **author**, at the moment of sharing: control and clarity - *I can see exactly who this reaches before I commit to it* - delivered by showing the real faces in each circle right on the card, with full names one tap away, rather than by an abstract number. For the **reader**, on opening: belonging - *this landed in my circle, it was meant for me* - plus the small, real liveliness of a shared room where you might catch a friend-of-a-friend's comment and enjoy it.

A deliberate decision sits at the center of this feature and should not be quietly reopened during build: the audience of a multi-circle post shares **one** comment room, even though that means a reader in Circle A can see comments from a reader in Circle B they don't share a circle with. This is a chosen concession, not an oversight. The shared room is part of the fun of Rogha, the loss of separation is mild, and the escape valves are clear and already exist: if something needs to stay between two people, text them; if something needs to stay within one group, write a post just for that group. We optimize the everyday case (one lively room) and leave the private case to the tools already built for it.

## In scope

- **A circle-first, multi-select audience picker.** Circles are the primary choice and are multi-selectable. Selecting one is just the single-circle case; there is no separate single-versus-many mode. Each circle is a card showing its name, a plain member count ("9 people"), and a row of up to five member faces with "and N more" for the rest. Tapping the card body toggles selection; tapping the faces opens a read-only member list.
- **"All Friends" as a standalone, mutually exclusive option.** It appears below the circles as the same card shape but with no faces. Selecting it clears any circle selection, and selecting any circle clears it. Its sub-line says so plainly ("23 people, on its own, not with circles").
- **One post to the union.** The post publishes a single time to everyone who is a member of at least one selected circle. A person who belongs to several of the selected circles receives it once.
- **One shared thread.** Comments and likes are a single thread visible to the whole audience, per the deliberate decision above.
- **A per-reader visibility label.** Every reader sees "Shared to [the selected circles they belong to]" and, if the post also went to circles they are not in, "and more." A reader in all of the target circles sees the full list; the author always sees the full list. Readers never see the names of circles they don't belong to. This label appears wherever the post's reach is surfaced (the post card, the reader header, and the note on the comment section).
- **Circle membership grants receipt.** A member of a selected circle receives the post whether or not they are the author's friend. Friendship is no longer what gates a circle post.
- **Notifications to the deduped union.** Submit/publish notifications fan out to everyone in the union, once per person, respecting each person's existing notification preferences.
- **Post lives at the bottom.** A single full-width Post action in a footer bar, disabled until at least one audience is selected. There is no Post button in the top nav.

## Explicitly out (deliberately, for v1)

- **Combining "All Friends" with specific circles in one post.** All Friends is mutually exclusive with circle selection. Confirmed by the UI session.
- **No friendship status on the share screen (override).** The earlier spec marked non-friend circle members here and offered a one-tap add. The UI session removed it: the cards and the member popup show no friendship labels, no warnings, no add action. The share moment stays clean. The assisted-friendship nudge therefore does not live here - it moves to the circle tab / circle detail (see Later, not now and Open questions).
- **No aggregate recipient count on this screen (override).** The earlier spec called for a live deduped "reaching N people" total as circles are toggled. The UI session dropped it: the selected cards themselves are the confirmation, each circle carries only its own "N people," and the footer shows no summary. Consequence to accept knowingly: overlap between circles is no longer surfaced as a single honest number. See Open questions.
- **Per-circle / siloed comment threads.** We chose the merged room on purpose. If it ever proves too leaky, siloed threads live in "Later, not now."
- **Showing a reader the names of circles they aren't in.** "And more" is the whole disclosure.
- **Per-post exclusion of specific people ("this circle, minus my sister").** A different feature; later.
- **Reusable custom distribution lists / ad-hoc person-by-person audiences.** Meaningful overhead, solves the last 5%.
- **Circle visual identity (color, font) and how it renders on a multi-circle post.** Parked until circles have identity at all.
- **Editing a post's audience after it publishes.** See Open questions.

## States & behaviour

- **Composer, no circles yet (first run).** Where the circle list would be, a single dashed-border panel: "No circles yet," a warm two-line description of what a circle is, and two equal-weight outline buttons - one to join an existing circle, one to make your own, neither styled as primary. The "Or" divider and the All Friends row still appear below, so a person with no circles can post the moment they select All Friends.
- **Composer, circles exist, none selected.** The picker shows the author's circles as cards with counts and faces. Post is disabled until at least one audience is chosen; a post with no audience is not a valid state.
- **Composer, one or several selected.** Selected cards take the foreground border and the muted fill (150ms colour transition, no scale or bounce). The selected cards are the confirmation of who is being addressed - there is no separate summary.
- **Member popup open.** Tapping a circle's faces opens a read-only sheet titled with the circle name and count ("Sunday Swimmers, 7 people"): a plain list of avatar plus full name, hairline between rows, a single "Done" to close. It has no add or remove and no friendship labels, and opening it does not change the circle's selection.
- **Submitted / queued (pre-reveal).** The queued post shows its "Shared to ..." label - full list for the author. As today, only a title/preview is visible to the audience before the Sunday reveal; the audience is computed at publish.
- **Published / read.** The reader opens the post, sees the visibility label built from their own circles, and lands in the single shared comment room.
- **Reader in several target circles.** Receives and sees the post once; the label lists the target circles they belong to.
- **Reader in a target circle but not the author's friend.** Still receives and sees the post. Intended behaviour.
- **A target circle is deleted or empties between submit and publish.** That circle drops from the set. If at least one target remains, the post publishes to what's left. If none remain, the post falls back to draft with a plain nudge to pick an audience again, rather than publishing to nobody.
- **Bad actor in the room.** Because a circle member you don't personally know can now see and comment, the safeguards are: the author's control over who is in the circle, the existing block and report behaviour, and the ability to leave a circle. The join moment carries its own honesty ("you're joining a circle with these people, and they'll see what you post here"), which is where this risk is best defused.

## Screen design (from the UI session)

The share step is the last step of the composer and should feel unhurried and warm, a moment of gentle control rather than a settings form. iOS, phone width, respecting safe areas. Top to bottom:

- **Nav row.** "Back" on the left in muted body text; "Share" centred as a small semibold label; nothing on the right.
- **Question block.** Left-aligned, generous padding. Editorial serif, about 22px semibold: "Who sees this?" Beneath it, one line of serif italic muted gray, about 14px: "Pick a circle, or a few. Nobody outside them will see it." This is the only voice-y copy on the screen.
- **Circle list.** A vertical stack of cards, about 8px apart, each a 1px hairline border, 12px radius, near-background fill. Top line: circle name at 15px semibold, a 22px circular checkbox on the right (empty outline unselected; filled foreground with a white check when selected); under the name, muted 12px member count. Face row about 11px below: up to five 26px avatars overlapping by about 7px, each with a 2px ring in the card's background so they read as separate, then muted 11.5px non-wrapping "and N more." Selected card: border goes to foreground, fill to muted gray, 150ms colour transition only. Two hit targets share the row - the card body toggles selection, the face cluster opens the member popup - each at least 44px tall, with the face zone given its own forgiving padding.
- **"Or" divider.** A small uppercase mono label in muted gray, wide letter-spacing, about 9px, purely structural.
- **All Friends row.** Same card construction, no faces, standalone and mutually exclusive with circles, sub-line stating so.
- **Footer bar.** Separated by a hairline top border, filled muted gray, holding only the Post button: full width, foreground fill, 12px radius, about 40px tall, disabled at ~45% opacity until an audience is selected. No count, no face pile, no summary.

**Visual system.** Grayscale only - background, foreground, muted surface, muted-foreground text, hairline borders. Editorial system serif for the question and popup titles; Geist for every row, label and control; mono only for the tiny uppercase "Or." Radii: 6px on buttons, 12px on cards, full on avatars and checkboxes. Transitions 150ms on colour and opacity only, no bounce or spring. No emoji, no colour accents, no badges, no counts beyond the plain "N people" per circle.

## Rules & edges

- **Audience** is the union of the members of every selected circle who were members before the post went live.
- **Temporal gate, per target circle.** A reader receives the post if they were a member of at least one selected circle before the post published. Joining after publish does not retroactively reveal it, consistent with the existing rule. Evaluated per circle, then unioned.
- **Dedup.** Receipt, the reader's view, and notifications are all deduped per person.
- **One room.** Comments and likes are visible to the entire union - the deliberate merged-room decision.
- **Per-reader label.** The intersection of the post's target circles with the reader's own circles, named; "and more" if any target lies outside that intersection. Author sees all named. A reader in none of the targets never receives the post.
- **Friendship is not required** to receive a circle post. Friendship now governs only the "All Friends" audience (and whatever else the friend graph still backs, e.g. profile visibility).

## Open questions

- **Is "and more" on the reader label vague or counted?** "Shared to A, B, and more" versus "and 2 more." Lean: keep it vague, since the count of *other* rooms is itself mild information about how wide the post went. (Distinct from the "and N more" avatar overflow on a circle card, which is a plain count.)
- **Can the author widen the audience after publish?** Narrowing is meaningless once seen. Lean: defer all post-publish audience editing out of v1 and let Republish cover "share it wider later."
- **Confirm the deleted-circle fallback** (drop the circle; revert to draft only if the audience would be empty).
- **Does dropping the aggregate recipient count cost anything real?** The UI removed the deduped "reaching N people" total, so cross-circle overlap is no longer shown as one number. Lean: acceptable, since the faces on each card make the audience tangible and the everyday case is one or two circles with little overlap. Revisit only if authors are surprised by who saw a post.
- **Where does the assisted-friendship nudge live now?** It was pulled off the share screen deliberately. It should surface in the circle tab / circle detail (see who in your circle you have not friended, add them there), but that is its own small spec, not this one.

## Later, not now

- The assisted-friendship surface in the circle tab / detail (friend-vs-member visibility and one-tap add), now that it is off the composer.
- Per-post deselect of individuals, and reusable custom distribution lists, for the non-uniform-circle case.
- A one-tap "all my circles" broadcast - the eventual bridge that lets "All Friends" quietly retire once circles cover the "everyone" case as effortlessly as the friend graph does today.
- Circle visual identity and how it renders when a post spans several circles.
- Siloed / per-circle comment threads, only if the merged room proves too leaky in real use.
- Migration of the author's old "posted the same thing to three circles" back-catalog into single multi-circle posts.
