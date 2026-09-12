# Spec: Multi-Circle Sharing - post to several circles at once, into one shared room

Status: **draft.** Builds on the Tier 0 shift toward a circle-first graph with assisted friendship (see the Tier 0 decision brief). Prompted by the recurring pain of writing the same post several times to reach overlapping-but-distinct audiences. The bet: making the circle the primary, multi-select audience - published once, into one shared room, with an honest per-reader visibility label - is both the heart of circle-first sharing and a straight upgrade over posting N times.

## Goal

When composing, the author chooses one or more circles as the audience (or, still, "All Friends"). The post publishes **once** to the union of those circles' members, and everyone who receives it shares a **single** comment-and-like thread. Each reader is shown which of *their own* circles the post reached.

The value is concrete: it kills the "write it three times so my sister doesn't see it" workaround, which today forces authors to either over-share or do manual busywork, and it makes the circle - not the friend - the thing you actually address when you sit down to write. That is the core loop of a circle-first Rogha.

There are two feelings to protect. For the **author**, at the moment of sharing: control and clarity - *I can see exactly who this reaches before I commit to it.* For the **reader**, on opening: belonging - *this landed in my circle, it was meant for me* - plus the small, real liveliness of a shared room where you might catch a friend-of-a-friend's comment and enjoy it.

A deliberate decision sits at the center of this feature and should not be quietly reopened during build: the audience of a multi-circle post shares **one** comment room, even though that means a reader in Circle A can see comments from a reader in Circle B they don't share a circle with. This is a chosen concession, not an oversight. The shared room is part of the fun of Rogha, the loss of separation is mild, and the escape valves are clear and already exist: if something needs to stay between two people, text them; if something needs to stay within one group, write a post just for that group. We optimize the everyday case (one lively room) and leave the private case to the tools already built for it.

## In scope

- **A circle-first, multi-select audience picker.** Circles are the primary choice and are multi-selectable. Each circle shows who is in it (a member count, and - tying into assisted friendship - non-friend members marked so the author notices who they might want to add). Selecting a single circle is simply the n=1 case; there is no separate "one circle" and "many circles" mode.
- **A live "who's receiving this" readout.** As the author toggles circles, a deduped human total updates ("reaching 11 people"), so overlap between circles is shown honestly rather than double-counted.
- **One post to the union.** The post publishes a single time to everyone who is a member of at least one selected circle. A person who belongs to several of the selected circles receives it once.
- **One shared thread.** Comments and likes are a single thread visible to the whole audience, per the deliberate decision above.
- **A per-reader visibility label.** Every reader sees "Shared to [the selected circles they belong to]" and, if the post also went to circles they are not in, "and more." A reader in all of the target circles sees the full list; the author always sees the full list. Readers never see the names of circles they don't belong to. This label appears wherever the post's reach is surfaced (the post card, the reader header, and the note on the comment section).
- **Circle membership grants receipt.** A member of a selected circle receives the post whether or not they are the author's friend. Friendship is no longer what gates a circle post.
- **Notifications to the deduped union.** Submit/publish notifications fan out to everyone in the union, once per person, respecting each person's existing notification preferences.

## Explicitly out (deliberately, for v1)

- **Combining "All Friends" with specific circles in one post.** All Friends stays a standalone choice. Mixing "All Friends + Circle X" invites confusing union math for a case nobody actually needs yet.
- **Per-circle / siloed comment threads.** We chose the merged room on purpose. If it ever proves too leaky in practice, siloed threads live in "Later, not now," not here.
- **Showing a reader the names of circles they aren't in.** "And more" is the whole disclosure. The reach is signaled; the other rooms stay private.
- **Per-post exclusion of specific people ("this circle, minus my sister").** The deselect-a-person idea is real but is a different feature; it belongs later.
- **Reusable custom distribution lists / ad-hoc person-by-person audiences.** Same reasoning - meaningful overhead, solves the last 5%.
- **Circle visual identity (color, font) and how it renders on a multi-circle post.** Parked until circles have identity at all.
- **Editing a post's audience after it publishes.** See Open questions; out of v1 either way.

## States & behaviour

- **Composer, no circles yet (first run).** The author is nudged to create a circle before they can choose a circle audience, since there is nothing to address otherwise. "All Friends" remains available so a brand-new user is never fully blocked from posting.
- **Composer, circles exist, none selected.** The picker shows the author's circles with their member counts. Submit is unavailable until at least one audience is chosen - a post with no audience is not a valid state.
- **Composer, selecting.** Chosen circles are visibly marked; the deduped "reaching N people" count updates live. The author can expand the selection to see actual members, with non-friends quietly marked and a one-tap way to add them.
- **Submitted / queued (pre-reveal).** The queued post shows its "Shared to ..." label - full list for the author. As today, only a title/preview is visible to the audience before the Sunday reveal; the audience is computed at publish.
- **Published / read.** The reader opens the post, sees the visibility label built from their own circles, and lands in the single shared comment room.
- **Reader in several target circles.** Receives and sees the post once; the label lists the target circles they belong to.
- **Reader in a target circle but not the author's friend.** Still receives and sees the post. This is the intended behaviour, and the author saw this person in the circle's member list at share time.
- **A target circle is deleted or empties between submit and publish.** That circle drops from the set. If at least one target remains, the post publishes to what's left. If none remain, the post falls back to draft with a plain nudge to pick an audience again, rather than publishing to nobody.
- **Bad actor in the room.** Because a circle member you don't personally know can now see and comment, the safeguards are: the author's control over who is in the circle, the existing block and report behaviour (which still filter that person's content from your view), and the ability to leave a circle. The join moment carries its own honesty ("you're joining a circle with these people, and they'll see what you post here"), which is where this risk is best defused.

## Rules & edges

- **Audience** is the union of the members of every selected circle who were members before the post went live.
- **Temporal gate, per target circle.** A reader receives the post if they were a member of at least one selected circle before the post published. Joining a circle after publish does not retroactively reveal the post, consistent with the existing visibility rule. The gate is evaluated per circle and then unioned - being "in early" on any one target circle is enough.
- **Dedup.** Receipt, the reader's view, and notifications are all deduped per person, regardless of how many target circles they share with the author.
- **One room.** Comments and likes are visible to the entire union. This is the deliberate merged-room decision, not an inheritance accident.
- **Per-reader label.** The label is the intersection of the post's target circles with the reader's own circles, named; "and more" appears if any target lies outside that intersection. The author sees all targets named. A reader in none of the targets never receives the post and so never sees a label.
- **Friendship is not required** to receive a circle post. Friendship now governs only the "All Friends" audience (and whatever else the friend graph still backs, e.g. profile visibility).

## Open questions

- **Can "All Friends" and circles be selected together?** Lean: no for v1. Keep All Friends a standalone audience to avoid confusing union math; revisit if a real need shows up.
- **Is "and more" vague or counted?** "Shared to A, B, and more" versus "and 2 more." Lean: keep it vague, since the count of *other* rooms is itself mild information about how wide the post went. Cheap to change later.
- **Can the author widen the audience after publish?** Narrowing is meaningless once people have seen it. Widening (adding a circle later) is coherent and maps onto the existing Republish thinking. Lean: defer all post-publish audience editing out of v1 and let Republish cover the "share it wider later" case.
- **Confirm the deleted-circle fallback** (drop the circle; revert to draft only if the audience would be empty) matches how you want near-publish edge cases to feel.
- **Share-moment display: counts-first or faces-up-front?** Deliberately deferred to UI design. Both to be prototyped and feel-tested; this spec fixes the behaviour (a deduped total, names on expand, non-friends marked), not the visual treatment.

## Later, not now

- Per-post deselect of individuals, and reusable custom distribution lists, for the non-uniform-circle case.
- A one-tap "all my circles" broadcast - the eventual bridge that lets "All Friends" quietly retire once circles cover the "everyone" case as effortlessly as the friend graph does today.
- Circle visual identity and how it renders when a post spans several circles.
- Siloed / per-circle comment threads, only if the merged room proves too leaky in real use.
- Migration of the author's old "posted the same thing to three circles" back-catalog into single multi-circle posts.
