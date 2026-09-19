# Spec: Start Another Circle - the calm expansion nudge

Status: **draft.** Once someone is established on Rogha (posting, in a circle), the biggest untapped growth is turning them into the founder of a *second* circle, which pulls in a fresh cohort. This is the compounding loop: every member who starts a circle becomes a new hub, and some of the people they bring in go on to start circles of their own. The entire challenge is doing it without a single nag, because a growth-poke is exactly the attention-economy move Rogha defines itself against.

## Goal

Help an established member notice they could start another circle - for a group of people who deserve their own room - and make starting it effortless, without ever pushing. Growth here should come from the idea landing at a natural moment, never from prompts stacking up.

The feeling to protect: "oh, I could make one for that group" - a small, self-directed realization, not "ugh, another prompt." If the nudge ever feels like the app wants something from you, it has failed.

The user: someone established (has posted, is in at least one circle). Explicitly not a first-run user - that's onboarding.

## In scope

- **A calm standing affordance.** "New circle" is always available and easy to find (on the circles surface, and the create option already in the share picker), so the capability is never buried. This is the primary mechanism: expansion through discoverability, not through prompting.
- **At most one gentle, dismissible contextual prompt**, fired on a real signal rather than a timer - the strongest candidate being a moment where the person clearly has someone in mind who isn't in a circle with them. Shown rarely, and dismissible for good.
- The create flow itself reuses create-a-circle and invite-by-link; there's nothing new to build there, this chunk is purely about *surfacing the idea* at the right moment and with the right restraint.

## Explicitly out (deliberately, for v1)

- **Recurring or push notifications** nudging circle creation. Never.
- **Escalating prompts, badges, streaks, or "you haven't made a circle lately."** All of it.
- **Growth incentives or referral rewards.**
- **Suggesting *who* to put in the new circle.** That's member/friend territory, owned by the model chunk.
- **The create-circle and invite mechanics themselves** (reused from earlier chunks).
- **First-run onboarding.** This is strictly for people who are already established.

## States & behaviour

- **Established user, always.** The standing "new circle" affordance is present and unobtrusive, whether or not any prompt ever fires.
- **The one contextual prompt.** Fires once, on a genuine signal (see open questions for which), dismissible; once dismissed, it never shows again.
- **After a second circle exists.** The prompt's job is done; no further nudging - the person has clearly got it.
- **The happy one-circle user.** Someone who only ever wants a single circle is never made to feel behind or incomplete.

## Rules & edges

- **Discoverability over prompting.** The affordance always exists; the prompt is the rare exception, not the mechanism.
- **The contextual prompt is tied to a real signal**, not elapsed time, appears at most once, is always dismissible, and is never delivered as a push notification.
- **Calm over conversion.** No metric-chasing pressure ever attaches to this surface.

## Open questions

- **Which single signal earns the one contextual prompt?** Candidates: interacting with a friend who shares no circle with you ("start a circle with [name]?"); a just-after-posting moment; or having been active with only one circle for a while. Lean: the shares-no-circle interaction, since it's the most concrete "there's a real person this would serve," and it's a genuine moment rather than a timer.
- **Should the prompt ever re-surface after long dormancy?** Lean: no. Once dismissed, gone.
- **Does the prompt seed anything?** Lean: no people-seeding (the model chunk owns that); at most the name randomizer reused from create-circle.

## Later, not now

- Smarter or additional contextual triggers, if the first proves too weak to move anyone.
- (Deliberately never) incentivized referrals.
