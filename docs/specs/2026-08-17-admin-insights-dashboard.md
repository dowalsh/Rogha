# Spec: Admin Insights — Topline, Funnel & per-user Roster (v1)

Status: **draft.** Extends the existing admin `Stats` tab (weekly signups / posts / word count) into three purpose-built surfaces: a **Topline** for aggregate progress, a **Funnel** for weekly drop-off, and a **Roster** for per-user diagnosis. The bet: at ~40 users, the highest-value analytics tool isn't a prettier aggregate chart — it's catching a specific person drifting away *and immediately understanding why*, plus seeing exactly *where in the weekly ritual* people fall off, so churn is learned from rather than discovered after the fact.

## Goal

Give the founder three things the current single-chart `Stats` tab can't: a sense of **how far Rogha has come**, a clear read on **where people drop off** in the weekly cycle, and the ability to run a **real-time post-mortem on a churning user**.

The **Topline** answers "is the thing growing and alive" — total and active users, posts, words written and read, reach over time. Its value is honest momentum: a place to watch the line go up and feel the progress. Deliberately a *progress* surface, not an optimization target.

The **Funnel** answers "where do people fall out of the weekly ritual" — of everyone, who's active; of the active, who showed up this edition; of those, who read, who read everything, who commented, who wrote. Its value is diagnostic: it turns "engagement is low" into "the cliff is between opening the edition and reading a post," which is a fixable, specific thing.

The **Roster** answers "who is slipping, and what happened to them." It surfaces users trending toward inactivity *before* they're gone, and lets the founder drill into any one of them to see the shape of their Rogha life — how many friends they made, whether anyone read or replied to what they wrote, whether they read anyone else. The value ties directly to the corrected north star (see [product-spec.md](../reference/product-spec.md) → "What Rogha optimizes for"): you can't deepen engagement or grow if people quietly leave and you never learn why. The feeling is **clarity and control** — and, at this scale, often **care**: the same view that flags a drifting user is the one that tells you it's a friend worth texting.

This is unashamedly a founder's god-view. It's a privilege — it can reach real, meant-for-a-few-friends writing — and v1 treats that privilege with restraint (see [Rules & edges](#rules--edges)).

## Definitions (the spine everything else uses)

**Edition = week.** All cadence below is measured in editions, not days — Rogha is a weekly product and a daily-active lens would measure the wrong thing.

**Activity (the heartbeat).** A user "did something" in an edition if they **read a post** (opened a post to read), liked, commented, published a post, or had a Jam track captured. **Merely opening the edition front page does *not* count** — you have to actually read a post. Reading is the floor; passive-but-real presence (a Jam track) still counts.

**Status bands:**

- **Active** — did something (per above) in **any** of the trailing **3 editions**.
- **Regular** (a qualifier used to judge slipping, not a displayed status on its own) — was active in **2 of the last 3 editions**.
- **Slipping** — a Regular user who has now **missed the last 2 editions**. Still inside the active window, but trending toward the line. This is the early-warning band and the reason the feature exists — catch them here, not after.
- **Dormant** — **3+ editions** with no activity. This is what the Topline's active-rate counts *against*. These are the post-mortems.
- **Never activated** — signed up but never became active (never crossed into regular activity after their first full edition cycle elapsed). Distinct from Dormant on purpose: a signup who never onboarded is a different problem, with a different fix, than a regular who left. Tenure-aware — a user who joined this week is never Dormant or Never-activated yet.

**Words read** = for every post-read, the word count of that post, summed. Platform-wide for the Topline; per-user in the drill-down. (A pure reads × words-per-post figure — "opened-and-read," not "provably finished.")

## In scope (v1)

All three surfaces live in the existing admin panel, alongside Posts / Comments / Reports / Music.

### The Topline (aggregate progress)

A row of headline numbers plus the existing weekly bar charts, covering:

- **Users** — total, and **new signups** (existing weekly + cumulative view, kept).
- **Active users** — the count and the *rate* (active ÷ total). The single number that most reflects whether Rogha is alive, so it leads.
- **Posts** — per edition and cumulative (kept).
- **Words written** — total authored across posts + comments (kept).
- **Words read** — total, per the definition above: the depth-of-consumption counterpart to words written.
- **Reach** — cumulative users over time.

Each headline shows its current value and a **vs. previous period** delta, so the Topline reads as a trajectory, not a snapshot.

### The Funnel (weekly drop-off)

A stepped funnel for a chosen published edition (default: the latest sealed one), showing where people fall out of the weekly ritual. Each step names its denominator explicitly so the cascade is honest:

- **All users** — the base.
- **Active** — % of all users who are Active. The health of the base.
- **Opened this edition** — of Active users, % who opened this edition (passed the reveal).
- **Read a post** — of those openers, % who opened at least one post to read.
- **Read every post** — of those openers, % who read *all* posts available to them that week. A completion / depth signal.
- **Commented** — of those openers, % who left at least one comment.
- **Wrote a post** — of Active users, % who published a post into this edition. (A creation branch off Active, not off openers — writing doesn't require opening the reveal.)

The reveal gate means these nest cleanly (readers ⊆ openers, commenters ⊆ openers). At 40 users any single week is noisy — the funnel is most useful read as *which step is the cliff*, and over time as a trend (see Later), not as precise weekly percentages.

### The Roster (per-user list)

A sortable table of every user, one row each, built to be *scanned for trouble*. Default sort surfaces who needs attention: **Slipping** first, then most-recently-lapsed. Each row shows:

- **User** — name / username / email.
- **Status** — Active / Slipping / Dormant / Never activated.
- **Last active** — relative ("2 weeks ago").
- **Joined** — tenure.
- **Friends** — accepted-friend count, with isolated users (below the viable threshold) visually flagged.
- **Wrote** — published posts.
- **Reception** — total reads + comments their posts have received (did their writing land, or go into silence).
- **Consumed** — posts read (are they still showing up to read, even if not writing).

Sortable by any column, so the same roster also answers "who are my most engaged," "who has the most friends," "who's written the most" — it serves celebration, not only triage.

### The per-user drill-down (the post-mortem)

Clicking a roster row opens a single-user view that tells the story of that person's Rogha, organized around **why someone thrives or leaves** rather than as a raw stat dump:

- **At a glance** — status, joined, last active, and a one-line plain-language read where possible ("Regular for 6 weeks, then went quiet — last three posts got no comments").
- **Network** — friend count, pending requests in/out, circles. Isolated (too few friends) is called out — the most common dead-account cause.
- **What they wrote** — their posts: title, status, edition, and per-post **reception** (reads, comments, likes received). Metadata only; each post links out to view the actual content, one deliberate click away.
- **How they were received** — the aggregate: did their posts get read and replied to, or land in silence. Posting into a void is its own diagnosable churn cause and gets emphasis.
- **What they consumed** — posts read, comments/likes given. Distinguishes a still-present lurker from someone actually gone.
- **Timeline** — last post read, last post written, last comment — the trail of when they faded.

## Performance & freshness (a hard constraint)

Rogha runs lean; these views must not tax the app. **Requirement: opening any insights view must be cheap — no heavy full-history scans on every load.** Two properties make that achievable without cleverness:

- **Sealed editions are immutable.** Once a Sunday reveal passes, that edition's funnel, participation numbers, and contribution to cumulative totals never change. They should be **computed once (the weekly publish is the natural moment) and stored as a small per-edition summary**, so the Topline and Funnel read pre-aggregated rows, not raw event history. This matters most for the metrics whose cost grows forever as data accumulates — cumulative words read, historical funnels — which are exactly the ones that would get slow if recomputed live.
- **Only two things must be live:** the current in-progress edition (one week of data — small) and the Roster's status flags ("who's slipping now"), which are bounded by user count (tiny), not by history. Those compute on demand.

**Acceptable staleness:** sealed-edition and cumulative figures may lag to the last snapshot (refreshed on the weekly cycle) — they do **not** need to be real-time. The live Roster should reflect current reality.

The *mechanism* (a stored per-edition summary, incremental counters, a refresh job) is an implementation decision for the build pass — this spec only requires that loads stay cheap and that staleness is bounded as above. It is a first-class requirement, not a nice-to-have.

## Explicitly out (deliberately, for v1)

- **No automated alerts.** The Roster and Funnel are pull, not push. No "X is slipping" notification or scheduled digest (fast follow, not v1 — don't build alerting before the signal is proven).
- **No real-time stats.** Bounded staleness is accepted by design (see Performance). Chasing live-updating aggregates is exactly what would make this heavy.
- **No cohort retention triangle / heatmap.** An aggregate tool for hundreds of users comparing signup cohorts. At 40, the per-user Roster *is* your retention view. Later.
- **No cross-edition funnel trend chart.** v1 funnel is one edition at a time. The stacked/over-time version is Later.
- **No activation funnel** for new signups (signup → first friend → first open → first post). Worth building, but it's a second question; v1 answers churn, not onboarding.
- **No in-dashboard outreach.** v1 shows who to reach out to; it does not send the message.
- **No CSV / data export.** Later.
- **No engagement "scores" or user value-ranking.** Sorting a roster is fine; assigning people a worth-score is the attention-economy framing the product defines itself against. Refused.
- **No editing user data** from these surfaces. Read-only; moderation actions stay in their existing tabs.

## States & behaviour

**Good-news empty state.** When nobody is Slipping, the Roster's triage section says so plainly and warmly — e.g. **"Nobody's slipping this week."** An empty triage list is a *win* and must read like one, not a broken table.

**Cold-start / small-data.** With few editions of history, charts and the funnel render honestly (a short series is fine, not padded). The Roster works from day one. Words-read and reception figures accumulate from when the underlying read/engagement signals began; where a metric's history is partial, the drill-down should not imply "zero reads" means "ignored" when the signal simply predates the user.

**Funnel with a thin edition.** An edition with few participants still renders its real (small) numbers — the cliff is the point, not the absolute size.

**Populated (normal).** Roster sorted with Slipping on top; Topline and Funnel show current values, Topline with deltas.

**Failure / slow.** Live pieces may lag behind a skeleton (the existing tabs already use delayed skeletons). A metric that can't be computed shows "—", never a wrong zero.

## Rules & edges

- **Admin-only.** Same gate as the rest of the admin panel. No user is ever told they've been flagged Slipping/Dormant — these are internal reads, not user-facing status.
- **The god-view privilege.** The drill-down exposes metadata freely (counts, timings, engagement). The actual *words* a user wrote are always **one deliberate click away**, never inline — a small friction that keeps "diagnosing churn" from sliding into "idly reading everyone's private posts." This view can reach honest, meant-for-a-few writing; it exists for product-learning and moderation, and that's the only reason to open the content.
- **"Active" is a trailing-3-edition, read-a-post measure** — not all-time, not daily, not mere edition-opens.
- **Passive-but-real participation counts** (a Jam track), reflecting the product's deliberate passive-participation floor. A pure edition-open with no read does not.
- **Reception vs. consumption are kept separate** everywhere. "Did people engage with *them*" and "did *they* engage with others" are different diagnostic questions and must never collapse into one "engagement" number.

## Open questions

- **Isolated-friend threshold.** What friend count flags "isolated" in the Roster? Lean: **fewer than 3** accepted friends (below this an edition feels empty and the account tends to die).
- **Funnel snapshot cadence.** Weekly-cron snapshot only, or also an on-demand "refresh current edition" action? Lean: weekly snapshot for sealed editions + always-live current edition, no manual refresh button in v1.
- **Never-activated horizon.** Confirmed lean: one full edition cycle elapsed after signup with no activity moves a user from "onboarding" to "Never activated."
- **"Read every post" denominator over time.** As a user's friend graph grows, "all posts available to them" grows — the metric is per-viewer per-edition, so this is self-correcting, but worth confirming it's computed against *that week's* available set, not lifetime.

## Later, not now

- **Slipping alerts** — a weekly nudge listing who newly crossed into Slipping, so post-mortems become proactive.
- **Cross-edition funnel trend** — the drop-off funnel as a stacked area / small-multiples over time, to see whether the cliffs are moving.
- **In-dashboard outreach** — a one-tap "reach out" from a drill-down (respecting that this is a person, not a funnel step).
- **Cohort retention heatmap** — the signup-cohort triangle, for when per-user scanning stops scaling.
- **Activation funnel** — signup → first friend → first open → first post, to diagnose onboarding the way the Roster diagnoses churn.
- **Trend sparklines on the Roster** — per-user activity over recent editions, so a row shows its own trajectory.
- **Segment filters / search**, and **CSV export**.

## Testing / layers

Web-only: new admin-panel views reading existing data, plus a per-edition summary written at publish time. Nothing touches Capacitor or native config.

- **Testable in the dev server / browser as-is.**
- **Needs a web deploy** before it's visible in the native app's admin panel.
- **No Xcode rebuild** required.

## Resolved (this pass)

- "Was a regular" = active in **2 of the last 3** editions.
- **Slipping** = missed the last **2** editions; **Dormant** = **3+** with nothing.
- Activity requires **actually reading a post** — opening the edition alone doesn't count.
- **Words read** = posts read × words per post.
- **Never activated** kept as a distinct band.
- **Database-light** promoted to a hard constraint: snapshot immutable/historical stats per edition; compute only the small live pieces (current edition, roster status) on demand; bounded staleness accepted.
