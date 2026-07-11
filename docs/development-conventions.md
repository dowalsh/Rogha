# Development Conventions — 101

A short, opinionated guide to how we branch, commit, and ship in **rogha**. The goal: `main` is always deployable, every feature is testable in isolation via its own Vercel preview, and history stays readable.

## The model: one branch per feature

We use **GitHub Flow** — short-lived feature branches off `main`, merged back via PR.

- `main` is production. It is always in a deployable state. Never commit directly to it.
- Every unit of work gets its own branch off the latest `main`.
- Push the branch → Vercel builds **one preview URL for that one branch**. Test the feature there (see [preview-testing.md](./preview-testing.md) for the full rundown of Clerk keys, the shared-DB nuance, and gotchas).
- Open a PR, review the diff, let checks run, merge, delete the branch.

**Do not** create long-lived branches (e.g. `v3`) that accumulate many unrelated features. They drift from `main`, make merges painful, and produce previews that are a soup of half-finished work you can't test independently. Keep branches small — ideally hours to a few days, not weeks. If a feature is large, split it into stackable pieces.

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

Full detail — Clerk key scoping, the shared-database nuance, why you must **never sign in on preview with your real production email**, and the webhook/lazy-sync behavior — lives in [preview-testing.md](./preview-testing.md). Read it before your first preview test session.

## Quick reference

```bash
# start a feature
git checkout main
git pull
git checkout -b feat/comment-reactions

# work, commit in small logical chunks
git add -p
git commit -m "Add reaction picker to comments"

# push → Vercel builds a preview URL for this branch
git push -u origin feat/comment-reactions

# open a PR, test on the preview, squash-merge, then:
git checkout main
git pull
git branch -d feat/comment-reactions
```

## TL;DR

One short-lived branch per feature off `main`. Name it `type/description`. Commit small, explain why. Open a PR, test on its preview, squash-merge, delete the branch. Never let a branch grow into a `v3` catch-all.
