# Development Conventions — 101

A short, opinionated guide to how we branch, commit, and ship in **rogha**. The goal: `main` is always deployable, every feature is testable in isolation via its own Vercel preview, and history stays readable.

## The model: feature branches through a staging branch

We use **GitHub Flow with one long-lived exception: `staging`.**

- `main` is production. It is always in a deployable state. Never commit directly to it.
- `staging` is a long-lived branch with a **stable** Vercel preview URL (`*-git-staging-*.vercel.app`). It exists because the native (iOS/Capacitor) app's `CAP_SERVER_URL` has to point at one fixed URL to test the native sign-in/deep-link flow — a fresh per-feature preview URL doesn't work for that. In practice, since most changes eventually need native verification, `staging` is the default path for nearly everything, not an edge case.
- Every unit of work still gets its own short-lived branch, but now branched off the latest `staging` (not `main`):
  1. `git checkout staging && git pull && git checkout -b feat/thing`
  2. Push the branch → Vercel builds **its own preview URL** too, for a quick web-only check before native testing.
  3. Merge into `staging` (PR or local merge) → `staging`'s stable URL updates.
  4. Point a native build's `CAP_SERVER_URL` at the staging URL and verify the real native flow.
  5. Once verified, fast-forward `main` from `staging` (`git checkout main && git merge staging && git push`) to ship.

**Keep the gap between "merge to staging" and "promote to main" short.** If several features land on `staging` at once and only one is ready to ship, you can't cleanly promote just that one — the usual long-lived-branch drift problem, just contained to one branch instead of `main` itself. Don't let unrelated half-finished work pile up there.

**Do not** create *additional* long-lived branches (e.g. `v3`) beyond `staging`. They drift, make merges painful, and produce previews that are a soup of half-finished work you can't test independently. Keep feature branches small — ideally hours to a few days, not weeks. If a feature is large, split it into stackable pieces.

## Branch naming

Use `type/short-kebab-description`. The type prefix keeps branches self-sorting.

| Prefix | Use for | Example |
|---|---|---|
| `feat/` | New feature or capability | `feat/comment-reactions` |
| `fix/` | Bug fix | `fix/preview-auth` |
| `chore/` | Deps, config, tooling, no behavior change | `chore/bump-clerk` |
| `refactor/` | Restructure without changing behavior | `refactor/user-actions` |
| `docs/` | Docs only | `docs/branching-guide` |

Keep names lowercase, hyphenated, and specific enough to know what the branch does at a glance.

## Commits

Write commits that explain *why*, not just *what*. Small, focused commits beat one giant one.

- Present-tense, imperative subject line: `Add reaction picker to comments`, not `Added` / `Adds`.
- Keep the subject under ~72 chars; add a body if the change needs context.
- One logical change per commit where practical — easier to review and revert.

We loosely follow [Conventional Commits](https://www.conventionalcommits.org/) prefixes (`feat:`, `fix:`, `chore:`) when it's natural, but readability matters more than strict format.

## Pull requests

Even solo, open a PR rather than merging locally — it gives you a diff review, a place for checks to run, and a paper trail.

- Title describes the outcome, not the mechanics.
- Description: what changed, why, and how you tested it (which preview URL, what you clicked).
- Merge only when the preview works and checks are green.
- **Delete the branch after merge.** Stale branches pile up fast.
- Prefer **Squash and merge** to keep `main` history one-commit-per-feature and clean.

## Previews & environments

Every branch auto-deploys a Vercel preview. Keep branches focused enough that the preview answers a single question: *does this feature work?*

Preview is fully isolated from production: its own Clerk **dev instance** and its own **separate Prisma Postgres database**, so testing never touches real users or data. Full detail — the authoritative Vercel env-var scoping, the database separation, admin-role promotion, and webhook/lazy-sync behavior — lives in [preview-testing.md](./preview-testing.md). Read it before your first preview test session.

## Debugging: request timing

The auth + data path (`auth()`/`currentUser()`, `getDbUser`, the layout's Clerk upsert, per-page Prisma queries) has dormant timing instrumentation in `src/lib/timing.ts`. Set `TIMING_LOGS=1` in the environment to turn it on — it logs `[timing] rid=<id> <label> <ms>ms ...` lines, correlated per request via an `x-rogha-rid` header middleware attaches. Off by default, zero overhead when unset.

## Quick reference

```bash
# start a feature — branch off staging, not main
git checkout staging
git pull
git checkout -b feat/comment-reactions

# work, commit in small logical chunks
git add -p
git commit -m "Add reaction picker to comments"

# push → Vercel builds a preview URL for this branch
git push -u origin feat/comment-reactions

# merge into staging (PR or local), then test natively against
# staging's stable preview URL (CAP_SERVER_URL=<staging preview url>)
git checkout staging
git merge feat/comment-reactions
git push
git branch -d feat/comment-reactions

# once verified on native, promote to prod
git checkout main
git merge staging
git push
```

## TL;DR

Short-lived feature branches off `staging`, not `main`. Name them `type/description`. Commit small, explain why. Merge to `staging`, verify on native against its stable preview URL, then fast-forward `main` to ship. `staging` is the one long-lived branch — keep it from accumulating unrelated half-finished work. Never let another branch grow into a `v3` catch-all.
