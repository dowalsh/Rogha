# Rogha — Claude guidelines

## After every code change

Always end the response with a clear list of the files changed and a suggested commit message.

## When a feature is being finalized (commit recommended)

Before wrapping up, check whether the change is significant enough to warrant updating docs/ for future reference — e.g. new/changed product behavior (docs/reference/product-spec.md), a new architectural pattern or module (docs/reference/architecture.md), a data model change (docs/reference/data-model.md), or a new non-trivial feature worth its own spec (docs/specs/). If so, propose the specific doc update alongside the commit message rather than silently skipping it. Small/mechanical changes (typo fixes, refactors with no behavior change, dependency bumps) don't need this.

## Always state how deep the change needs testing

This app has three layers that don't all refresh together: the Next.js dev server, the deployed web app (served live into the native shell via `capacitor.config.ts`'s `server.url`), and the compiled native iOS binary (Capacitor plugins, `capacitor.config.ts` native config, `Info.plist`/Xcode project settings). A change to one doesn't imply the others picked it up. After every change, say explicitly which of these need to happen before it can be verified:
- Testable in the dev server / regular browser as-is.
- Needs a web deploy (to wherever `CAP_SERVER_URL`/`server.url` points) before it's visible in the native app — true for any plain component/page/API change.
- Needs an Xcode rebuild + reinstall (`npx cap sync ios` alone is not enough — that only updates local `ios/` project files, not the binary on-device) — true for anything touching `capacitor.config.ts`, native plugins, `Info.plist`, or the Xcode project itself.

Don't leave this implicit or assume the user will infer it — call it out the same way you call out the changed-files list.

## Working on multiple features in parallel (git worktrees)

The user runs concurrent features/agents via `git worktree`, sibling folders next to the main `rogha` checkout (e.g. `rogha-<feature-name>`), each on its own branch. One `.git` and branch history is shared across all of them, but git will never let the same branch be checked out in two worktrees at once — so worktrees on different branches can never collide when committing.

What *isn't* shared between worktrees: untracked files. Each new worktree needs its own `.env`/`.env.local` (copy from the main `rogha` checkout) and its own `npm install` — don't assume `node_modules` or env vars are present just because another worktree has them. If a tool (`tsc`, `next`, etc.) fails because `node_modules` is missing, say so plainly rather than silently skipping verification.

When creating a new worktree for a feature:
```
git worktree add ../rogha-<feature-name> -b <feature-name> staging
```
(branch from `staging` unless told otherwise — check what the current feature branches in this repo are based on if unsure).

When a feature branch is done and merged, clean up properly rather than deleting the folder:
```
git worktree remove ../rogha-<feature-name>
git branch -d <feature-name>
```

Other things worth flagging when relevant, not enforcing silently:
- Two worktrees running `npm run dev` at once need different ports (`next dev -p 3001`, etc.) — the default port will collide.
- If `.env`/`DATABASE_URL` points at a shared dev database, concurrent schema migrations across worktrees can collide — flag this before running a migration from a worktree if another worktree might be doing the same.
- A feature branch's worktree snapshots its base branch (e.g. `staging`) at creation time — if that base has moved on, mention that a merge/rebase may be needed before opening a PR.
- CLAUDE.md itself is a tracked file — an edit made on one branch/worktree only reaches other worktrees once that branch merges back. A repo-wide process change (like this section) belongs on `main` directly, not buried in a feature branch.
