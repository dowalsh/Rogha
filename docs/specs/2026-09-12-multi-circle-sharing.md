# Spec: Multi-Circle Sharing - post to several circles at once, into one shared room

Status: **built.** Prompted by the recurring pain of writing the same post several times to reach overlapping-but-distinct audiences. The bet: making the circle the primary, multi-select audience - published once, into one shared room, with an honest per-reader visibility label - is both the heart of circle-first sharing and a straight upgrade over posting N times. This doc was reconciled to the shipped code on 2026-09-19; the "As built" notes below record where implementation refined the pre-build design.

## Goal

When composing, the author chooses one or more circles as the audience (or, still, "All Friends"). The post publishes **once** to the union of those circles' members, and everyone who receives it shares a **single** comment-and-like thread. Each reader is shown only which of *their own* circles the post reached.

The value is concrete: it kills the "write it three times so my sister doesn't see it" workaround, and it makes the circle - not the friend - the thing you address when you sit down to write. That is the core loop of a circle-first Rogha.

Two feelings to protect. For the **author**, at the moment of sharing: control and clarity, delivered by showing the real faces in each circle right on the card, with full names one tap away, rather than by an abstract number. For the **reader**, on opening: belonging, plus the small liveliness of a shared room where you might catch a friend-of-a-friend's comment and enjoy it.

A deliberate decision sits at the center of this feature and should not be quietly reopened: the audience of a multi-circle post shares **one** comment room, even though a reader in Circle A can see comments from a reader in Circle B they don't share a circle with. This is a chosen concession, not an oversight. The shared room is part of the fun of Rogha, and the escape valves already exist: if something needs to stay between two people, text them; if something needs to stay within one group, write a post just for that group.

## In scope (as built)

- **A circle-first, multi-select audience section, inline in the composer.** Not a separate screen: it sits in the editor under the label "Audience," with the line "Pick a circle, or a few. Nobody outside them will see it." Circles are multi-select cards; "All Friends" is a standalone card below an "Or" divider.
- **Each circle card** shows the circle name (as a pill), a plain "N people" count, and a row of up to five member faces with "and N more" for the rest. Tapping the card body toggles selection; tapping the faces opens a read-only member list.
- **"All Friends" is standalone and mutually exclusive with circles.** Selecting it clears any circle selection; selecting any circle clears it. It uses the same card shape and also shows member faces (of your friends).
- **One post to the union.** Publishes a single time to everyone who is a member of at least one selected circle; a person in several selected circles receives it once.
- **One shared thread.** Comments and likes are a single thread visible to the whole audience.
- **A per-reader visibility label.** A reader sees the names of only the target circles they belong to; if the post also went to circles they aren't in, the label ends with "& others." The author sees the full list. Readers never learn the names of circles they don't belong to.
- **Circle membership grants receipt.** A member of a selected circle receives the post whether or not they are the author's friend. (Today circle membership still requires friendship to be established first - decoupling that is the separate invite-by-link work.)
- **Notifications fan out to the deduped union** of every target circle's joined members, minus the author, respecting each person's notification preferences.
- **Posting requires membership.** An author can only target circles they are themselves a joined member of, and at least one circle is required for a circle-audience post.

## As built: where the code refined the pre-build design

These are deliberate implementation decisions that differ from the earlier UI brief, recorded so the brief doesn't get treated as the source of truth:

- **It's an inline composer section, not a standalone "Who sees this?" screen.** The audience picker lives in the editor page, titled "Audience," rather than as the last full-screen step.
- **"All Friends" shows member faces and carries no explanatory subtitle.** The brief had All Friends faceless with an "on its own, not with circles" sub-line; the build gives it the same face row as a circle and conveys exclusivity through selection behaviour rather than copy.
- **The empty state has one button, not two.** With no circles yet, the card reads "No circles yet. Ask a friend to add you to one, or start your own," with a single "Create your own circle" action (a new circle can be created inline, and is auto-selected). The "join an existing circle" button waits on invite-by-link.
- **The reader label reads "...& others." in orange.** Rendered as a sentence ("Comments visible to [circle], [circle] only." or, when the viewer isn't in every target circle, "... & others." with that trailing clause in orange). The orange is a deliberate, single semantic-colour exception to the otherwise grayscale system - a quiet "there are people here you don't share a circle with" flag.
- **No aggregate recipient count.** The earlier idea of a live deduped "reaching N people" total was dropped; the selected cards are the confirmation, and each circle shows only its own count.
- **Audience is a set on the post, stored as join rows.** A post's target circles are replaced as a whole set on every save; `audienceType` stays `CIRCLE`, and the legacy single-circle field is deprecated (no longer written). This is described here as behaviour, not a table design.

## Explicitly out (deliberately, for v1)

- **Combining "All Friends" with specific circles in one post.** Mutually exclusive by design.
- **Per-circle / siloed comment threads.** The merged room was chosen on purpose.
- **Showing a reader the names of circles they aren't in.** "& others" is the whole disclosure.
- **Per-post exclusion of specific people ("this circle, minus my sister").** A different feature; later.
- **Reusable custom distribution lists.** Meaningful overhead for the last 5%.
- **Circle visual identity (colour, font) and how it renders on a multi-circle post.** Parked until circles have identity at all.

## States & behaviour

- **Composer, no circles yet.** The dashed empty panel plus the "Or" divider and All Friends card, so a person with no circles can still post via All Friends.
- **Composer, none selected.** Post is disabled until at least one audience is chosen; a post with no audience is not a valid state (server rejects a circle-audience post with zero circles).
- **Composer, selecting.** Selected cards take the foreground border and muted fill (150ms colour transition). The selected cards are the confirmation; there is no separate summary.
- **Member popup.** Tapping a circle's faces (or All Friends' faces) opens a read-only bottom sheet titled "[name], N people" listing avatar + name, with a "Done" button. No add/remove, no friendship labels; opening it does not change selection.
- **Published / read.** The reader lands in the single shared comment room and sees the per-reader visibility label built from their own circles.
- **Reader in several target circles.** Receives and sees the post once; the label lists the target circles they belong to.
- **Reader in a target circle but not the author's friend.** Still receives and sees the post (intended - membership grants receipt).
- **A target circle is deleted between save and read.** Its membership in the post's set simply drops. As built, if that empties the set, the post has a circle audience with no circles and so becomes visible to the author only - it is not auto-reverted to draft (see Open questions).

## Rules & edges

- **Audience** is the union of the members of every selected circle who were joined before the post went live.
- **Temporal gate, per target circle, then unioned.** A reader receives the post if they were a joined member of at least one target circle before it published. Joining after publish never grants retroactive access. Evaluated per circle, then unioned.
- **Dedup.** Receipt, the reader's view, and notifications are all deduped per person.
- **One room.** Comments and likes are visible to the entire union.
- **Per-reader label.** The intersection of the post's target circles with the reader's own circles, by name; a trailing "& others" (orange) when any target lies outside that intersection. The author sees all target circles named and receives the full circle-id list to prefill editing; a reader receives only the scoped set.
- **Authoring.** Only circles the author is a joined member of can be targeted; at least one is required.
- **Editing the audience.** The target set is rewritten on every save, so audience is freely editable while the post is the author's to edit. Post editing is permitted at any status, so an audience change after publish is technically possible and recomputes visibility (bounded by each member's temporal gate); there is no dedicated post-publish "share wider" UI - Republish remains the sanctioned path for reaching people who joined later.
- **Friendship is not required** to receive a circle post; it governs only the "All Friends" audience.

## Open questions

- **Empty-audience fallback.** As built, deleting all of a post's target circles leaves it author-only rather than reverting it to draft with a nudge. Confirm that silent narrowing is acceptable, or add the revert.
- **Post-publish audience editing.** It's currently possible via the normal edit path with no dedicated UI or guardrail. Decide whether to surface it deliberately (as a "share wider" action) or explicitly prevent it and route everything through Republish.
- **The "& others" wording and the orange flag.** Confirm both the copy and the single colour exception are what you want long-term, or hand them to the copy-editor pass.

## Later, not now

- Per-post deselect of individuals, and reusable custom distribution lists.
- A one-tap "all my circles" broadcast - the eventual bridge that lets "All Friends" retire once circles cover the "everyone" case.
- Circle visual identity and how it renders when a post spans several circles.
- Siloed / per-circle comment threads, only if the merged room proves too leaky in real use.
- Migration of the author's old "posted the same thing to three circles" back-catalog into single multi-circle posts.
