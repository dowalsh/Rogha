# Spec: Nudges framework

Status: **design — not yet built.** `src/components/Nudge.tsx` (presentational)
and `src/components/UsernameNudge.tsx` (a one-off announcement using it) exist
today from the profiles & friends work — this spec describes generalizing
that into a durable, multi-nudge framework. Nothing below is implemented yet.

## Goal

Rogha will periodically want to tell users about something — "usernames &
profiles just shipped," a future feature launch, a policy change — without
writing a bespoke banner + dismissal mechanism each time. Today's
`UsernameNudge` dismissal is `localStorage`: durable per-device, but not
tracked server-side and not shared across devices. That's a fine stopgap for
one announcement; it breaks down once there's a second nudge and a need to
reason about "what has this user seen, anywhere" centrally.

## Two kinds of nudge, one framework

- **State-driven.** Visibility is computed from real account state (e.g. "you
  have an unread pending friend request" — something with a real underlying
  flag). Auto-resolves — it disappears the moment the underlying condition is
  met. No durable dismissal bookkeeping is strictly required for these (though
  see below), since the state itself is the source of truth.
- **Announcement.** Pure one-time messages with no underlying app state — the
  username/profiles nudge is this kind: we don't care whether the user acts on
  it, only that they've seen it once. Visibility is purely "has this user
  dismissed/seen nudge `X`" — these need durable, per-user tracking, because
  there's nothing else to check.

Both are expressed the same way: a registry entry + a presentational
`<Nudge>` render. The framework doesn't need to hard-code which kind a given
nudge is — it just checks `isEligible` (if present) and falls back to "not yet
dismissed" from the durable store.

## Data model

One new table covers both kinds:

```prisma
model NudgeDismissal {
  userId      String
  nudgeId     String   // stable slug, e.g. "profiles-launch-2026-07"
  dismissedAt DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([userId, nudgeId])
}
```

Dismissing any nudge (state-driven or announcement) writes a row here. This
also makes dismissal durable across devices — today's username/profiles
nudge only tracks dismissal in `localStorage`, so it reappears on a new
device/browser until the user dismisses it there too; this closes that gap
for every future nudge, this one included once it's migrated over (see
below).

## Registry

Nudges are data, not new components per nudge:

```ts
// src/lib/nudges.ts
type NudgeDef = {
  id: string;            // stable slug — never reuse across unrelated nudges
  priority: number;      // lower shows first when multiple are eligible
  message: string;
  ctaLabel: string;
  href: string;
  isEligible?: (me: Me) => boolean; // state-driven condition; omit for pure announcements
};
```

Adding a new "Rogha update" nudge later is an entry in this array — no new
component, no new route, no new migration.

## API surface

- `GET /api/nudges` — for the current user, evaluate the registry against
  `NudgeDismissal` rows (+ `isEligible` where present), return the eligible,
  undismissed set sorted by `priority`.
- `POST /api/nudges/[id]/dismiss` — writes a `NudgeDismissal` row for
  `(currentUser, id)`.

## Client

A single `NudgeStack` component (replacing the ad hoc `UsernameNudge` mount in
`layout.tsx`) fetches `/api/nudges` and renders **one nudge at a time** —
highest priority first — using the existing generic `<Nudge>` presentational
component. Rationale: a vertical pile of banners gets noisy fast, especially
on mobile, and only one action is ever needed from the user at a time. A
small "1 of 2" affordance can hint there's another queued once the first is
dismissed/resolved.

**Open question to resolve before building:** do state-driven nudges always
outrank announcements, or should announcements take priority since they're
often time-sensitive/expiring? Leaning toward state-driven-first (something
actionable/blocking-ish beats something purely informational), but not
decided.

## Migration to the new framework

`UsernameNudge` becomes a plain registry entry (`id: "profiles-launch-2026-07"`,
no `isEligible` — pure announcement) rather than its own component —
`src/components/UsernameNudge.tsx` gets deleted once `NudgeStack` exists, and
its `localStorage` dismissal is superseded by the real `NudgeDismissal` row
(one-time migration nuance: a user who already dismissed it via `localStorage`
has no server-side record, so they'd see it once more after the cutover —
acceptable given it's a single low-stakes announcement).
`Nudge.tsx` itself (the presentational card) is reused as-is.

## Out of scope (explicitly)

- Any admin UI for authoring nudges — the registry is a code array, edited
  via normal deploys, not a CMS.
- Analytics/reporting on nudge engagement (e.g. "% of users who clicked
  through") — could read off `NudgeDismissal` later if wanted, not designed
  here.
- Per-platform targeting (e.g. web-only vs native-only nudges) — not
  requested yet; would likely be another optional registry predicate if it
  comes up.
- Expiry (auto-hide a nudge after a date without requiring dismissal) — not
  requested yet; would be a simple `expiresAt` on the registry entry if
  needed.

## Data model touch points (flags, not a design)

- New `NudgeDismissal` model (see above) — additive, no backfill needed since
  nothing durable exists yet to migrate from.
- No changes to `User` needed — this framework is fully self-contained in the
  new table plus the registry.
