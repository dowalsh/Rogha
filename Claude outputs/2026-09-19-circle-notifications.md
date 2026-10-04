# Spec: Circle Notifications - celebrate arrivals, stay quiet on departures

Status: **draft.** Once circles are the primary unit and people can join them by link, a circle becomes a living thing - people arrive, it gets renamed, people leave. Right now none of that is surfaced: the notification types cover posts, comments, likes and friend requests, but nothing about circle life. This makes a circle's membership changes visible, in a way that leans into the excitement of people arriving without ever making a departure into an event.

## Goal

Keep circle members aware of who's in the room and when that changes, and make the arrival of a new person feel like the small, happy event it is. A circle that quietly grows and shifts with no signal feels dead; a circle that pings you every time someone glances at it feels like spam. The line Rogha draws: **arrivals are celebrated, departures are silent.**

The feeling to protect: a new person joining your circle should give the same little lift as a friend walking into the room - "oh nice, Tom's here." And the inverse: nobody should ever be publicly announced as having left or been removed, because that's the opposite of a lift.

## In scope

**The circle-notification category.**
- A new notification category for circle membership and lifecycle events, alongside the existing post/comment/like/friend-request categories. In-app rows are always created; push follows the member's preference; there is no email for circle events (they're lighter and more frequent than the things email is reserved for).
- These notifications route to the circle itself (its page / member list), not to a post.
- Members get their own preference toggle for circle activity, like every other category.

**The arrival events (celebrated).**
- **You were added to a circle.** When a member adds you directly (the existing "add a friend to a circle" path), you're told "[Name] added you to [Circle]" and can go straight to it.
- **Someone joined or was added to a circle you're in.** Every existing member is told "[Name] joined [Circle]" (or "[Adder] added [Name] to [Circle]"). This includes the join-by-link arrival, whose celebratory, per-person, never-batched behaviour is specified in the invite-by-link chunk and simply rides this category. Consistent with that: arrivals are individual and undampened - five people joining is five happy pings, not a digest, because Rogha leans into that.

**The change events (informational, quieter).**
- **A circle was renamed.** Members are told the circle they're in has a new name, so it doesn't silently become an unfamiliar entry in their list. In-app for certain; push is optional and quieter than an arrival.

**The silences (deliberate non-events).**
- **Someone left** a circle: no notification to anyone. The member list reflects it, quietly.
- **Someone was removed:** no broadcast to the circle. Removal is never an announcement.

## Explicitly out (deliberately, for v1)

- **Email for circle events.** In-app and push only; circle churn does not belong in an inbox.
- **Batching or digesting arrivals.** Deliberately individual - the excitement of each arrival is the point (see the invite-by-link hype decision).
- **Departure and removal notifications.** Silent by design, not an oversight.
- **Injecting circle events into Buzz.** Buzz stays what it is - new *conversation* on posts, one row per post. Circle events live in the notifications feed and on the circle surface, so Buzz isn't diluted into a mixed activity stream.
- **Pending-invite / approval events.** There is no approve-to-join flow (joining is instant), so there's nothing to notify about there.
- **The join-by-link hype behaviour itself.** Owned by the invite-by-link chunk; this chunk only provides the category it rides.

## States & behaviour

- **You're added directly by a member.** In-app row plus push (if enabled): "[Name] added you to [Circle]," tapping through to the circle. A warm arrival, aimed at you.
- **A new person arrives in your circle** (joined by link or added by a member). In-app row plus push for every existing member: "[Name] joined [Circle]." One per arrival, never merged.
- **Your circle is renamed.** In-app row for members; the circle's name updates everywhere it appears. Push optional and low-key.
- **Someone leaves or is removed.** Nothing. The member list simply no longer shows them next time it's viewed.
- **You do something yourself** (create a circle, rename your own, add someone). No self-notification - you did it, you know.
- **Preferences off.** With circle activity muted, in-app rows still accrue (so nothing is lost), but no push is sent - the same always-in-app / conditional-push shape every other category uses.

## Rules & edges

- **Celebrate arrivals, stay quiet on departures.** The organizing principle; every event decision follows from it.
- **Always in-app, conditional push, never email.** In-app rows are always written; push respects the member's circle-activity preference; email is never used for these.
- **Individual, not batched.** Arrivals are one notification each, undampened, consistent with the invite-by-link hype stance.
- **Circle notifications route to the circle**, not to a post or a profile.
- **No self-notifications.** An actor is never notified of their own action.
- **Buzz is untouched.** Circle events do not enter the Buzz feed; they live in notifications and on the circle.

## Open questions

- **The removed person.** Being silently removed could leave someone confused ("why can't I see this circle?"). Options: stay fully silent (kinder, current lean), or a single quiet, private "you're no longer in [Circle]" to that one person (no reason given). Needs a call.
- **Rename push.** Is a rename worth a push at all, or in-app only? Leaning in-app-only, since a rename isn't an arrival and push should stay mostly for the happy events.
- **"Added someone" reach.** Notifying the whole circle when a member adds another is great hype at small sizes; confirm it still feels good, not noisy, in a larger circle - and whether a per-circle mute (Later) is the pressure valve if it doesn't.
- **Home-surface presence.** Beyond the notifications feed, should the circle itself carry a light "recently joined" affordance (faces of the newest members)? Leaning yes as a calm reflection, distinct from the ping.

## Later, not now

- **Per-circle mute**, if a very active circle's arrivals ever get noisy for someone.
- **A circle "activity" view** collecting its own arrivals/renames in one place, if the notifications feed proves too thin a home for it.
- **Email digests** for circle activity, only if members ask for a slower, batched channel (which would run against the current no-email stance, so only on real demand).
