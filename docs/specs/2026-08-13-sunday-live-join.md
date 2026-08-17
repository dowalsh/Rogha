# Spec: Sunday live join — write and join the current edition on the day

Status: **draft.** Builds on the weekly Edition cadence (the Sunday 07:00 UTC publish/reveal
described in [product-spec.md](../reference/product-spec.md)). Prompted by user feedback: people
*love* the Sunday timing but resent that writing *on* Sunday benches them for a full week. The
bet: Sunday can become a live "join day" — the edition reveals in the morning and then fills
over the course of the day — without giving up the one shared clock that makes the moment feel
collective.

## Goal

Today an edition is a snapshot: everything submitted before the Sunday 07:00 UTC cron publishes
at once, and anything written after has missed the boat until the *next* Sunday. That's cruel in
a specific way — the weekend is when people finally have time to write, and Sunday is when the
whole thing comes alive, yet the door shuts at the exact moment the party starts. Someone sitting
down Sunday afternoon, already reading everyone else's posts, can't join the conversation they're
in the middle of.

This feature opens Sunday as a **live join day**. The reveal ritual stays exactly where it is
(Sunday morning), but the edition remains *open* for the rest of the day: a post written on
Sunday can be published straight into today's live edition instead of waiting a week. The feeling
is **not missing the party you showed up to** — turning "benched for seven days" into "you're
already here, come on in." Crucially it does this on a **single global clock** so the edition
stays one shared object everyone experiences together, and it keeps the join a *deliberate*
act rather than an accident of timing — protecting both the collective moment and the
considered, unhurried feel the product is built on.

## In scope

**Sunday becomes a fork, not a deadline.** Monday through Saturday is completely unchanged: you
draft, you submit, and your post waits for the upcoming Sunday reveal like always. What's new is
only on Sunday, while the join window is open. Writing on Sunday, you get an explicit choice:

- **Submit for next week** — the **default**. Your post joins *next* Sunday's synchronized
  reveal, exactly as a mid-week submission would. Safe, familiar, and the right call for anyone
  who wants to be part of the big shared moment rather than trickle into an edition that's
  already been revealed.
- **Publish to today's edition** — a deliberate, clearly-labelled opt-in. Your post goes *live
  now*, into the edition everyone is currently reading. This is the new path, and it's a
  conscious "I want in today," never something that happens to you silently.

**The edition fills over Sunday, then seals.** The morning reveal is untouched — same ritual,
same blurred overlay, same "N others already opened this week." From there the edition grows as
people publish live through the day. The join window runs **24 hours from the existing Sunday
reveal** — i.e. it opens at the current 07:00 UTC publish and seals at 07:00 UTC Monday, at which
point the edition becomes the permanent archived record. That span is deliberately chosen: 07:00
UTC is midnight in Pacific time, so the window is *exactly* the Pacific Sunday (midnight to
midnight) and comfortably covers the rest of the US too. After the seal, Sunday writing falls back
to the normal "submit for next week" path.

**A live join announces itself as live.** Publishing into today's edition fires a new **PUBLISH**
notification to the author's eligible audience — distinct from the existing SUBMIT notification.
The distinction is the whole point: SUBMIT means "coming Sunday, blurred, queued"; PUBLISH means
"this is live right now, go read it," and it routes the recipient straight to the readable post
in the live edition, not to a Coming Sunday preview. Like every notification, it respects each
user's existing preferences, so anyone who wants a quiet Sunday keeps their opt-out.

**Late arrivals just show up as unread — no new surface.** Someone who opened this morning's
edition and comes back later simply finds the new posts folded into the edition hero's existing
"N unread" count. There's no bespoke "joined today" banner or separate cue to design; a
live-joined post is an unread post like any other, and the PUBLISH notification is what actively
signals it.

## Explicitly out (deliberately, for v1)

- **No change to Monday–Saturday.** There is no mid-week instant publish. The living-edition
  behaviour is Sunday-only; the other six days keep the anticipation model intact. Extending
  "live join" to any other day would erode the weekly cadence, which is the point of the product.
- **No per-user / local-timezone windows.** One global clock, one seal instant, one shared
  edition. Local windows were considered and rejected — see Rules & edges for why.
- **Publish-now is never the default.** It is always the deliberate second option, so no one
  accidentally spends a post into an already-revealed edition when they meant next week's moment.
- **The reveal moment does not move.** Sunday morning stays the reveal; this feature adds a
  daytime tail, it doesn't relocate the ritual.
- **PUBLISH is not a firehose.** It's the same low-volume, friends-only fan-out SUBMIT already
  does, on the same preference controls — not a broadcast and not a re-engagement blast.

## States & behaviour

**Monday–Saturday (unchanged).** Draft → submit → the post sits in Coming Sunday (title visible,
thumbnail blurred) → it publishes at the next Sunday reveal. No new behaviour.

**Sunday morning — reveal.** Identical to today: the edition reveals behind the existing gate,
the ritual moment lands.

**Sunday, window open — writing.** The composer presents the two-way fork: **Submit for next
week** (default, selected) and **Publish to today's edition** (deliberate opt-in), each clearly
labelled with what it means ("joins next Sunday" vs "goes live now, in today's edition"). Nothing
is ambiguous about which edition a post is headed for.

**Sunday, window open — publishing live.** On choosing publish-now, the post appears immediately
in the live edition, visible to the author's eligible audience under the normal visibility rules,
and a PUBLISH notification fans out. For a recipient who hasn't opened today's edition yet, the
new post simply sits behind the same reveal gate as everything else. For one who already opened,
it appears within the edition's existing "N unread" count — no special treatment.

**Sunday seal — Monday 07:00 UTC.** 24 hours after the reveal the edition closes to joins and
becomes the permanent archived record — identical for everyone, everywhere. Writing after the
seal behaves like Monday–Saturday: submit for next week.

**Empty / quiet Sunday.** If no one joins live, the day simply looks like today's Sunday — the
morning reveal and nothing after. The feature adds no empty-state noise; absence of live joins is
just a normal quiet week.

**Bad-actor / abuse.** Live publishing grants no reach a normal post doesn't already have — same
audience scoping, same block/report behaviour, same preference-respecting notifications. The
Sunday window doesn't create a new broadcast surface; it changes *when* a post can land, not
*who* it can reach.

## Rules & edges

- **One global clock, deliberately.** The window opens at the Sunday reveal and seals at one
  global instant for everyone. Local per-timezone windows were rejected: they would dissolve the
  shared clock (the edition open for some friends, sealed for others, mutating for ~two real-world
  days as local Sundays sweep the globe), create genuine ambiguity about *which* edition a
  cross-timezone friend's post joins, and fight the existing one-edition-per-UTC-week model. The
  synchronized moment is the product; we don't trade it for timezone fairness — especially because
  the submit/publish fork already handles fairness (below).
- **The fork is the pressure-release valve.** Because a Sunday writer can always choose
  "submit for next week," missing the live window is never a lockout — it's just the normal path
  into next week's reveal. That's what makes a generous-but-imperfect global cutoff acceptable:
  the boundary only decides *live-join-today vs. the normal next-week experience*, never
  *participate vs. don't*.
- **The window is 24h from the existing reveal.** Opens at the current Sunday 07:00 UTC publish,
  seals at 07:00 UTC Monday. Because 07:00 UTC is Pacific midnight, this maps to exactly the
  Pacific Sunday and covers the rest of the US comfortably; revisit only if a heavily
  eastern-hemisphere cohort emerges.
- **Live posts obey the normal visibility rules.** A live-published Sunday post is visible only to
  the author's eligible audience (friends / circle / etc.), exactly like any other post — it is
  not more public for having gone live mid-day.
- **Temporal friend gate reuses the edition timestamp.** A Sunday live-published post gates friend
  visibility on the *edition's* `publishedAt` (set at the morning reveal), the same timestamp every
  other post in that edition uses — not on its own go-live moment. One edition-level timestamp
  keeps [post-visibility-rules.md](./2026-08-02-post-visibility-rules.md)'s single access authority
  coherent, and the few-hours difference is immaterial.
- **Nothing to "pull forward."** A post queued (SUBMITTED) mid-week already publishes at the Sunday
  reveal — it doesn't sit waiting past Sunday — so there's no queued post to bring forward into the
  live window. The publish-now fork is purely for posts *written during the Sunday window itself*.

## Open questions

The four drafting-stage questions are all **decided** and folded into the body above: the join
window is **24h from the existing reveal** (Sunday 07:00 UTC → Monday 07:00 UTC, i.e. exactly the
Pacific Sunday); a live post **reuses the edition's `publishedAt`** for the temporal friend gate;
there's **no pull-forward** case because queued posts already publish at the Sunday reveal; and
late arrivals need **no bespoke cue** — they ride the edition hero's existing "N unread" count.
Nothing material remains open for v1.

## Later, not now

- **Local / per-timezone windows** — only if a genuinely global, eastern-hemisphere-heavy userbase
  emerges and the single-clock unfairness starts costing real participation the fork can't cover.
  Deliberately parked, with the trade-offs recorded above so it isn't re-argued from scratch.
- **Cutoff tuning from data** — once there's real Sunday-join usage, the exact seal time (and
  whether the window should be longer/shorter) can be set empirically instead of by instinct.
- **Extending "live" thinking beyond Sunday** — explicitly *not* a direction to drift in. Noted
  here only to name it as out: the six-day anticipation cycle is load-bearing, and a second live
  day would start dismantling it.

## Docs to update when this ships

- [product-spec.md](../reference/product-spec.md) — the Edition section (Sunday live-join window,
  the submit-vs-publish fork, the global seal) and the Notifications section (new PUBLISH type
  alongside LIKE / COMMENT / SUBMIT / FRIEND_REQUEST).
- [post-visibility-rules.md](./2026-08-02-post-visibility-rules.md) — whichever way the temporal-gate
  timestamp question above is resolved for live-joined posts.
