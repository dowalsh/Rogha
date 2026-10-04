# Spec: Friends & Circle Model - consolidation (decision doc)

Status: **draft / decision doc - needs a working session, not a build.** Once invite-by-link ships, Rogha for the first time contains "a circle member who is nobody's friend," and several long-parked questions about how friendship and circles relate come due. This gathers them in one place, each with options and a lean, so they can be decided deliberately rather than by accident. **Nothing here is settled** - every numbered section is a decision for you to make. It is deliberately the "quiet piece of the puzzle" that was kept out of every shipping chunk; it has matured now that the member-not-friend state is real.

## Why this is now

- Circle membership is decoupled from friendship (invite-by-link): you can be in a circle with people you haven't friended.
- Friend suggestions were pulled out of every shipping chunk and parked here on purpose.
- So the model needs a coherent story for three things: what friendship is *for* now, what the member-vs-friend distinction means to a user, and where "All Friends" is heading.

## The decisions to make

### 1. What is friendship for now?
Friendship historically gated three things: circle membership, the "All Friends" audience, and profile visibility. Invite-by-link removes the first. Its remaining jobs are the All Friends audience and profile visibility.

- Options: (a) keep friendship first-class with those two jobs; (b) begin draining it toward the background as circles take over; (c) rethink it entirely (e.g. asymmetric / follow-like).
- Lean: (a) for now, (b) as direction - keep it, but plan its quiet retreat.
- **Decide:** confirm friendship stays mutual and keeps those two jobs for the foreseeable term.

### 2. The member-vs-friend distinction - shown, and how?
Your framing: a member-not-friend is "someone you share a social group with but might not be too close with - your All Friends essays aren't necessarily for them." So the distinction is real and meaningful, not just plumbing.

- Options: (a) surface it passively on the circle member list (a quiet "not yet a friend" marker plus a one-tap add); (b) surface it actively (a nudge); (c) don't surface it at all.
- Lean: (a) passive and calm - this is the "assisted friendship" indicator that used to be its own chunk. No nudging.
- **Decide:** whether to build the passive indicator, and where it lives.

### 3. Friend suggestions (absorbed from the old assisted-friendship chunk)
Do co-members get surfaced to each other as people you could friend?

- Options: (a) a passive "not yet a friend" marker with a manual add; (b) an active "people you might know from your circles" surface; (c) nothing.
- Lean: (a). Option (b) drifts toward the algorithmic-suggestion feel Rogha avoids.
- **Decide:** (a) vs (c), and the exact surface if (a).

### 4. The future of "All Friends"
All Friends persists so nobody is forced to build an everyone-circle. The earlier decision was: don't retire it until circles cover the "everyone" case as easily, via a one-tap "all my circles" broadcast.

- Options: (a) keep All Friends indefinitely; (b) build "all my circles" and eventually retire All Friends; (c) retire it soon.
- Lean: (b), on no fixed timeline - build the bridge first, retire only when it's genuinely as effortless.
- **Decide:** commit to the bridge as the path, and what "as easy" has to mean before retirement.

### 5. The two consent models
Friendship is mutual (request/accept). Circle membership is unilateral (you join a room someone opened). Both now coexist.

- Question: coherent long-term, or should they converge?
- Lean: coherent - they mean genuinely different things (a friendship is a two-way tie; a membership is "I'm in this room"). Keep both.
- **Decide:** confirm the two-consent-model coexistence is intended, not transitional.

### 6. Profile visibility, fully specified
Decided in invite-by-link: non-friend co-members see each other's picture and name and the standard friend action; everything else stays gated behind friendship.

- Question: anything to add or restrict now that member-not-friend is common?
- Lean: leave as is.
- **Decide:** confirm.

### 7. Migration / direction
Because the shift was additive, existing friendships and circles keep working; nothing forces a migration.

- Question: any back-catalog cleanup or re-framing wanted, or is "additive, no migration" the final answer?
- Lean: no migration - let the model drift naturally as circles take over.
- **Decide:** confirm no migration.

## What this doc is not

Not a buildable spec. It's the agenda for the model conversation. Once these are decided, the buildable pieces that fall out (the passive member/friend indicator from 2/3, the "all my circles" bridge from 4) each become their own small spec.

## Later, not now

- The "all my circles" broadcast, once section 4 is decided.
- Any eventual retirement of All Friends.
- Asymmetric / follow-like friendship, only if the mutual model ever proves wrong.
