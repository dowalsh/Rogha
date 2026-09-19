# Spec: Invite by Link - join a circle from a shared link or code, no friendship required

Status: **draft.** The growth unlock of the circle-first shift: today a circle only grows through the existing friend graph, which means the person you most want to reach - someone not yet on Rogha - can't be brought in. This lets any circle member share a link (and a memorable code) that lets someone join the circle directly, whether or not they already have a Rogha account, and whether or not they're anyone's friend yet. It is the first feature in which "a circle member who is nobody's friend" can exist.

## The non-goal this deliberately revises

Rogha's stated non-goals include "No open circle joining - circles aren't discoverable or joinable by link/search - membership only grows through your existing friend graph." This feature revises that line on purpose, and the revision should be made in `product-spec.md` when this ships. The new line: **no *discoverable* or *open* joining.** Circles are still never searchable, listed, or public. What changes is that a member can hand a specific person a link or code, and joining through it is now itself a way the graph grows. An invitation shared person-to-person is the sanctioned growth vector the product's own north star names ("grows by being worth an invitation"); a searchable directory of circles is not, and remains out.

## Goal

Any member of a circle can produce a shareable invite - a link plus a short, memorable code - and send it however they like (text, chat, in person). Someone who receives it lands on an invite page that names the circle and who invited them, and joins in one deliberate tap. If they don't have Rogha yet, they can join on the web and create an account as the last step, without losing the invite. Joining makes them a **member** of that circle - able to see and post to it - without requiring any prior friendship.

The value is reach through invitation: it turns every member into someone who can bring their people in, which is how a circle-first Rogha is meant to spread. It also removes the highest-friction moment in the old flow (find an email, send a request, wait for accept) at exactly the point where a newcomer is deciding whether Rogha is worth it.

The feelings to protect, by actor. For the **inviter**: "bringing my people in is easy and a little exciting." For the **joiner**: welcomed and slightly exclusive - the code makes joining feel chosen, like being handed a key, not filling in a form. For the **circle**: hype - a new person arriving is a happy event everyone gets to feel, not a silent database change.

## In scope

**Generating and sharing an invite.**
- Any joined member of a circle can generate its invite (no owner role required - consistent with today's equal-standing circles).
- The invite is a **link plus a code**. The code is short and memorable, with a 3-digit numeric suffix appended for uniqueness and to blunt guessing (e.g. "SUNDAY-SWIM-482"). The member can set/customize the memorable part; the suffix and uniqueness are handled for them, and a default is suggested so they never have to think of one.
- The invite is **multi-use** (one link/code brings in everyone, not a single person) and **lives for 7 days**, on one shared clock for both the link and the code.
- The share action offers a ready-to-send message shaped like: circle name, a short line of pitch, the link, and the code. The pitch line matters - for a true newcomer it is part of their first impression.
- **Re-sharing** offers a choice: copy the existing (still-valid) invite, or create a new one. Creating a new one immediately retires the old link and code.

**The invite page (everyone passes through it).**
- Opening the link lands on an "[Name] invited you to [Circle]" page, with the code shown and prepopulated, a taste of what Rogha is, and one clear action to join. Even when the app could open directly, the join is one deliberate tap on this page rather than a silent auto-join - the small ceremony is the point, and it guarantees the newcomer always sees the pitch.
- **Web is the primary join surface.** The page's primary action is to join here, on the web. "Get the app" is deliberately held back until after joining is done, so nothing splits the newcomer's attention mid-join.

**Joining.**
- **Join first, account after.** A person commits to joining before being asked for an account. Only at the last step, framed as finishing the join (not a separate signup gate), do they provide the minimum to become a member, including at least a name so they aren't a faceless entry to the circle.
- The invite context survives account creation - someone who has to sign up mid-flow returns to complete the same join and lands *in the circle they aimed at*, not a generic home screen.
- **Joining makes you a member, full stop.** No automatic friendships are created - not even with the inviter - and no friend suggestions are surfaced here. The joiner simply becomes a joined member of that one circle. How, and whether, friendship grows out of shared circle membership is deferred wholesale to the friends/circle model-consolidation chunk.
- **No approval.** Joining is instant. The backstops that make that safe are: the join-moment makes it plain who's in the circle and that they'll see what you post; any member can see who has joined; and any member can remove anyone.
- Joining is **idempotent** - a double-tap or a returning member lands as a member once, never an error.

**The arrival ("Welcome to [Circle]").**
- Right after joining, the joiner lands on the circle in a warm "Welcome to [Circle]" state: who's here, and the honest framing that the circle's content arrives on the weekly rhythm ("your first edition drops Sunday") rather than as a backlog. Because of the temporal gate, a new member sees posts published *after* they join, so a fresh or freshly-joined circle is not a bug to hide but a "first edition coming" to frame.
- This is the circle-level welcome only. The broader first-time-on-Rogha welcome and the cold-start create-a-circle path are the onboarding chunk, not this one.

**Hype.**
- When someone joins, **everyone already in the circle is notified**, individually and celebratory - a new person arriving is exciting and Rogha leans into that. This is a deliberate, wanted exception to Rogha's usually-calm notification stance; it is not batched or dampened.

## Explicitly out (deliberately, for v1)

- **Approval / request-to-join.** No approve step, and an expired or revoked invite dead-ends warmly ("ask your friend for a new one") rather than offering a request. Request-to-join is the planned upgrade to both, later.
- **Auto-friendship on join**, including with the inviter. Members only.
- **Friend suggestions of any kind** - surfacing co-members you could friend, a one-tap add, "people you might know." Deferred wholesale to the friends/circle model-consolidation chunk; none of it is in this scope.
- **Seamless deferred-deep-link "magic"** for the app-install gap. The code is the guaranteed fallback; no third-party attribution/fingerprinting is introduced, in keeping with the no-tracking ethos.
- **Owner/admin roles on circles.** Any member invites; any member removes. Unchanged.
- **Discoverable or searchable circles.** Still a hard non-goal; invites are hand-shared only.
- **Offensive-code moderation.** Codes are member-set and not policed (accepted, given invites are hand-shared; the one exposure is that a code shows on the invite page a newcomer sees).
- **A flood cap / abuse throttle** beyond basic rate-limiting of code-entry attempts. Deferred to cleanup.
- **The cold-start onboarding (Maria) and the "start another circle" nudge (Richard).** Separate chunks that build on this one.
- **The "Welcome to Rogha" first-run layer.** The onboarding chunk.

## States & behaviour

- **Member generates an invite, first time.** They get a link and a memorable code (customizable, suffix handled), live for 7 days, multi-use, ready to share with a pre-filled message.
- **Member re-opens sharing.** Offered "copy existing" (still within 7 days) or "create new" (retires the old immediately).
- **Joiner has the app and is signed in, taps on their phone.** Straight to the invite page, one tap, member. Lands on the Welcome-to-[Circle] arrival.
- **Joiner has an account but isn't signed in.** Invite page, sign in, join. The invite never assumes a particular account; whoever completes it joins.
- **Joiner is brand new (no app, no account), on the web.** Invite page with the pitch, taps join, provides the minimum to finish (name + sign-in method), lands in the circle. "Get the app" is offered only now.
- **Joiner on desktop.** Same web join; "get the app" becomes a way to carry it to their phone.
- **Joiner is already a member.** The link short-circuits to "you're already in here," no duplicate, no error.
- **Invite expired (>7 days).** "Snooze you lose? Looks like this link is old - ask your friend for a new one!" on a page that still shows what Rogha is, rather than a dead end. No request path yet.
- **Invite revoked/rotated.** Same warm dead-end as expired - the old link and code no longer admit anyone.
- **Link was forwarded to someone unintended.** They can still join (no approval) - the accepted bearer-token reality - and any member sees the join and can remove them. Expiry and rotation bound the exposure.
- **Repeated wrong code entries.** Code entry is rate-limited so the 3-digit space can't be brute-forced; after a few misses it backs off.
- **A joiner who was removed re-uses the link.** Open question below.

## Rules & edges

- **Membership no longer requires friendship.** Joining a circle by invite establishes membership directly. Friendship becomes an optional overlay whose remaining job is the "All Friends" audience. (The full model consequences are the parked model-consolidation chunk.)
- **Any joined member** of a circle can generate/share an invite and can remove any member; there is no owner role.
- **Invites are bearer tokens**: whoever holds a live link/code can join. Safety comes from the 7-day expiry, member-initiated rotation/revocation, visible joins, easy removal, and join-moment transparency - not from approval.
- **Link and code share one 7-day clock** and are both multi-use.
- **A joiner becomes a `JOINED` member** and is thereafter subject to the normal temporal gate: they see posts published after they joined, never the circle's back-catalog.
- **Account required for membership**, but the account step comes after the decision to join and is framed as completing it; the invite context must survive it and return the joiner to the intended circle.
- **Web is a first-class place to join and participate**, not just an auth bounce. The trade this commits to: the weekly-reveal nudge for web-only users is carried by email (web push being weak, especially on iOS Safari), and "get the app" is the path to reliable notifications.
- **Profile visibility for a non-friend co-member:** you can see their picture and name, and their profile keeps its normal not-yet-a-friend state (the standard friend action that exists on any profile is still there); everything else stays gated behind friendship, as today. This feature adds no new friend prompting on top of that baseline.
- **The join notification** goes to every existing member of the circle, individually, respecting each person's notification preferences for delivery channel but not dampened in frequency.

## Open questions

- **Removed-then-rejoin.** If a member is removed and later taps a still-live invite, do they rejoin freely, or does removal block the link for them until a member re-invites? Leaning: removal should stick against the same invite, or removal is toothless. Needs a call.
- **Web identity minimum.** Confirm exactly what "the minimum to finish" is - almost certainly a display name, with avatar optional and addable later. (Overlaps the deferred web-identity item.)
- **Expiry length, final.** We've settled 7 days on one clock. Flagging only so it's a conscious default, not an accident, when the request-to-join upgrade later changes the cost of expiring.
- **The product-spec non-goal edit.** This feature requires rewriting the "No open circle joining" non-goal (see top). That edit lands when this ships.

## Later, not now

- **Request-to-join**, upgrading both the expired/revoked dead-end and the no-approval model into an optional ask-first path.
- **Seamless app-install resume** (deferred deep linking or an App Clip preview) so the app path feels as smooth as web, if the code fallback proves too clunky in practice.
- **Abuse signals / flood cap** if a link ever gets shared far past its intent.
- **A desktop QR nicety** to hand the invite from a desktop to a phone.
- **Inviter-as-auto-friend**, if we later decide the person who deliberately brought you in is a strong enough signal to skip the suggestion step.
