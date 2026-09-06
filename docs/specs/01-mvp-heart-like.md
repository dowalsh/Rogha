# Spec 1 — MVP: the heart like (faces, not numbers)

## What we're building

A like at the end of a post. One button, one reaction: a heart. When you tap it, **your avatar lands on the post**. The reward is seeing your own face arrive and sitting alongside the friends who also liked it — not a number ticking up.

No counts. No names. No reaction picker. That comes later (see Spec 2).

## Where it lives

At the end of a single post, after the body copy, below a hairline rule. It closes the piece as a warm "nice one" beat — not a toolbar, not a floating action bar. It is not on the Edition front page, and not on individual passages.

Reference design: `Rogha Like — Emoji tray.dc.html` in this project. Build the MVP as that layout with the tray reduced to one heart button.

## Anatomy, top to bottom

1. **Hairline rule** separating the post body from the like block.
2. **Faces row** — the avatars of everyone who liked this post, including you if you did.
3. **The button** — a single round heart button beneath the faces, left-aligned with them.

Nothing else. No "6 likes", no "Sarah and Tom liked this", no heart icon that fills red in place, no like/comment counter pairing.

## The gesture

One tap. Instant, no confirmation, no menu, no long-press.

- Tap once → your avatar appears at the **front** of the faces row, animating in: it drops in from slightly above with a small rotation that settles to straight, over about half a second. It should read as a face arriving and landing, not a UI element fading in.
- The heart button becomes visibly "on" (filled background, darker ring) so it's obvious the tap registered.
- Tap again → your avatar leaves the row (a quick fade/scale out, faster than the arrival) and the button returns to its resting state.

Optimistic: the avatar lands the moment the tap happens. If the write fails, remove it quietly and restore the button.

## Faces layout

Avatars are round, roughly 34px, hairline border, sitting side by side with a small gap — **not** heavily overlapped like a stacked-avatar count. Every face is fully visible. Your own face always comes first.

Scaling, in order:

1. **Fits one row** — a single row of faces, left-aligned.
2. **Overflows one row** — wrap to a **second row offset horizontally by half a face**, so the two rows interlock like a honeycomb. The second row starts half an avatar-width in from the left and overlaps the first row vertically by a few pixels. This is the primary "many" treatment.
3. **Overflows two rows** — keep exactly two rows and let the block **scroll sideways**. Never add a third row, never collapse into "+12", never fall back to a number.

Faces per row is driven by available width, so it differs on phone and desktop; roughly five on a phone.

## The three states

### Zero likes — calm and inviting
No faces. In their place, one quiet line in the editorial serif, italic, muted:

> No likes yet. Yours would be the first.

Then the heart button. The empty row keeps its height so the block doesn't jump when the first face lands. It should read like a blank signature line at the end of a letter — open, not sad. Do not use a sad-face illustration, a dashed placeholder avatar, or "Be the first to like!" exclamation energy.

### One like — intentional and warm
A single avatar, full size, at the left of the row, with the button beneath. Nothing indicates that one is few: no "1", no empty slots, no ghost avatars waiting to be filled, no centering that spotlights the lone face. It's simply a name signed at the bottom of a piece. This state is the hardest one to get right — if it feels like scarcity, something in the layout is wrong.

### Many likes — graceful
The honeycomb second row, then sideways scroll. Warmth comes from the density of faces. Even at twenty likes there is no number anywhere in the block.

## Copy

Warm, casual, print-flavoured. Sentence case. Never a metric.

- Empty state: "No likes yet. Yours would be the first."
- Accessible label for the button: "Like this post" / when on, "Remove your like".
- Tooltip/alt on a face: that person's name.

No exclamation marks. No "Show some love". No emoji in system copy.

## Visual rules

Follow the Rogha design system as-is: monochrome, hairline borders, flat backgrounds, no gradients or shadows beyond the faintest card shadow. The heart is the one place saturated colour is allowed — use the existing likes red (`--like-active`) for the "on" state, and keep the resting state a plain muted outline. Round pill/full radius on the button and avatars.

Motion is minimal and functional everywhere except the avatar arrival, which is allowed to have a little character — it is the payoff of the whole feature.

## Out of scope for the MVP

Read tracking, reaction variety, passage-level likes, likes on comments, notifications design, a "who liked this" list screen, and any count or name summary. Spec 2 covers reaction variety.

## Done when

- Tapping the heart lands your face at the front of the row with the arrival animation, and untapping removes it.
- Zero, one, many and "more than two rows" all look deliberate at phone and desktop widths.
- No number and no name summary appears anywhere in the block.
