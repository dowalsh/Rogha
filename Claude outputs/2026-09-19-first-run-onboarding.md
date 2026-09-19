# Spec: First-Run Onboarding - convince, then set up, then write

Status: **draft.** The other half of the growth loop: invite-by-link brings people to the door, this decides whether they walk through it and come back. It covers the first-time-on-Rogha experience for both kinds of arrival - the person a friend invited (who lands already inside a circle) and the cold first-mover who found Rogha alone (who has to build their circle from nothing) - and the guided path from "just arrived" to "wrote my first post."

## Goal

Get a brand-new person from arrival to their first post with the least friction and the most conviction. The order matters and is the core principle: **convince before you configure.** A newcomer should feel Rogha is worth it before being asked to do any setup, because motivation is what carries them through the steps, not the other way round.

Two arrivals, one destination:
- **The invited newcomer** (came through an invite link) arrives already a member of a circle. They need less pitch - a friend already vouched - and mostly need to understand the weekly rhythm and be nudged to write.
- **The cold first-mover** arrives with no invite and nobody they know on Rogha. They need the strongest version of the pitch, then to create their first circle and invite their people, because they have no audience until they do.

The feelings to protect. For the cold first-mover: "this is worth it, and I can get my people here." For the invited newcomer: "now I get what this is - let me join in." For both, the through-line is calm confidence, never a nagging setup wizard that makes Rogha feel like a chore before it's felt like a gift.

## In scope

**The "Welcome to Rogha" layer (app-level).**
- A first-time-on-Rogha welcome that teaches the weekly, small-audience rhythm and orients the newcomer. It is app-level and distinct from the per-circle "Welcome to [Circle]" arrival (which belongs to invite-by-link).
- **Gated on having never submitted a post.** It persists across sessions until the person writes their first post, because writing one is the moment Rogha actually clicks. Once they've submitted, it retires and they see the normal home.
- It adapts to what the person has already done, so an invited newcomer (already in a circle) isn't re-asked to make one, and a cold first-mover is.

**The value moment (convince).**
- Before any setup, a newcomer sees why Rogha - the weekly cadence, the small chosen audience, the no-ads/no-noise stance - made concrete with real example posts and, where available, a line or two of member testimony. This is strongest and most necessary for the cold first-mover, who has no friend's vouch to lean on; for the invited newcomer it can be lighter, since the invite already carried social proof.
- For a cold arrival this comes *before* account creation, so the decision to sign up is made by someone already sold.

**The cold first-mover spine.**
- After the pitch and account creation, the cold first-mover is guided to: **create their first circle** (name it, with a suggested default and a randomizer to help, and the reassurance that it can be changed later), then **invite people** to it (using the invite-by-link flow), then **write their first post.**
- Inviting is emphasized, because a circle of one is nothing - but nothing is hard-gated (see rules).

**The homepage checklist.**
- A calm, dismissible checklist on the home screen orients a not-yet-established user through the remaining steps: account, a circle, people invited, a first post written, and the first edition landing Sunday. It reflects real progress (an invited newcomer sees the circle step already done) and is guidance, not a wall.

**The "what to write" first-post help.**
- At the compose moment, a newcomer can open help that lowers the stakes: an honest, human note in the creator's voice; concrete examples of what people actually write (a book review, a small life update, the satirical festival dispatch); the reassurance that short is good and that a shared journal for your friends is one of the best uses; and permission to have fun with it.
- This help is most needed on the first post but is reusable by anyone at any compose moment.

## Explicitly out (deliberately, for v1)

- **The invite mechanics themselves.** Generating/sharing/joining is the invite-by-link chunk; this feature only *sends the cold first-mover into* that flow and reacts to its result.
- **The per-circle "Welcome to [Circle]" arrival.** That's invite-by-link's; this is the app-level welcome that may wrap it.
- **The "start another circle" nudge for existing users.** That's the expansion chunk - this is strictly first-run, for people who haven't posted yet.
- **Friend suggestions of any kind.** Deferred to the model-consolidation chunk.
- **Referral or growth-reward mechanics.** Out entirely; growth comes from the invitation being worth making, not from incentives.
- **Testimonial sourcing and curation tooling.** The value moment *uses* example posts and testimony; how those are gathered, consented to, and rotated is an operational dependency, not built here (see open questions).

## States & behaviour

- **Cold first launch (no account).** Value moment first (the strongest pitch), then account creation, then the guided spine: create a circle, invite, write. The home screen shows the checklist as its main content, since there's nothing else to see yet.
- **Invited first launch (arrived via an invite).** The person is already a member of a circle. The Welcome-to-Rogha layer is lighter (they were vouched for and just saw the invite page), skips "create a circle," and orients them to the rhythm and toward writing their first post. Their checklist shows the circle step already complete.
- **Returning, hasn't posted yet.** The Welcome layer and checklist persist, reflecting whatever's done and what's left. Calm, not nagging - no escalating prompts.
- **Posted once.** The Welcome layer retires; the checklist gives way to the normal home. Rogha now behaves as it does for any established user.
- **Cold user who made an account but no circle yet.** The home is the checklist, leading with "create your first circle." Nothing is broken or empty-feeling; the checklist *is* the content until a circle exists.
- **The empty-but-expectant circle.** A freshly created or freshly joined circle has no back-catalog (temporal gate), so the newcomer sees "first edition drops Sunday," not a dead empty feed - the same reframe used at circle arrival.
- **Dismissed.** The newcomer can collapse the checklist; it stays recoverable rather than gone, so dismissing isn't a trap, but it also never re-nags.

## Rules & edges

- **Convince before configure.** For a cold arrival, the value moment precedes account creation; setup steps never come before the person has reason to want them.
- **Welcome layer gate:** shown while the user has never submitted a post; retired on first submit. It is per-person and app-wide, independent of any single circle.
- **The checklist is guidance, not a gate.** Nothing is hard-required in sequence. A person can post to All Friends without making a circle; a cold first-mover can write before anyone accepts an invite. The checklist encourages the productive order (a circle and invites before a post, so the post has an audience) without enforcing it.
- **Temporal-gate interaction.** Because a new member only sees posts published after they join, seeding a circle with a post *before* inviting won't reach the people invited afterwards. The guided order (invite, then everyone writes for the first reveal) exists precisely so a fresh circle's first edition lands with its people already in it. This is encouraged, not enforced.
- **Adaptivity.** Every first-run surface reads current state (has an account? in any circle? invited anyone? posted?) and shows only what's genuinely left, so the two arrival paths share one system rather than being two hard-coded flows.
- **Calm over completion.** No streak-shaming, no escalating badges, no "you're 60% done!" pressure. The checklist informs; it does not push.

## Open questions

- **Where the value proof comes from.** The pitch leans on real example posts and member testimony. Sourcing (curated real posts vs. hand-written examples), consent for using real ones, and how they stay fresh is an operational dependency to resolve before this can ship with its best face. Placeholder examples can carry a first version.
- **Full-screen welcome vs. inline home.** Is the Welcome-to-Rogha layer a brief full-screen intro on first launch, or purely the home-as-checklist? Leaning: a short value-first intro for the *cold* arrival (who needs convincing), then everything else inline on home; the invited arrival skips straight to the inline home, having already been pitched by the invite page.
- **Cold path and "All Friends."** A cold first-mover has no friends yet, so "All Friends" is empty for them - the circle-and-invite spine is really their only path to an audience. Confirm the cold flow leads unambiguously with "create a circle" rather than presenting an empty All Friends option that can only disappoint.
- **First-post help placement and copy.** The honest note, the examples, the shared-journal framing all want a real copy pass (and the creator's actual voice for the note).

## Later, not now

- **The "start another circle" nudge** for established users (the expansion chunk).
- **Referral / growth-reward mechanics** - deliberately never, in the incentive sense.
- **Testimonial curation tooling** - a way to gather, consent, and rotate real member testimony and example posts, if the manual first version proves worth systematizing.
- **Richer first-post scaffolding** (prompts, templates) beyond the honest note + examples, only if newcomers still stall at the blank page.
