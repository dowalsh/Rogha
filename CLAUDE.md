# Rogha — Claude guidelines

## After every code change
Always end the response with a clear list of the files changed and a suggested commit message.

## When a feature is being finalized (commit recommended)
Before wrapping up, check whether the change is significant enough to warrant updating docs/ for future reference — e.g. new/changed product behavior (docs/product-spec.md), a new architectural pattern or module (docs/architecture.md), a data model change (docs/data-model.md), or a new non-trivial feature worth its own spec (docs/specs/). If so, propose the specific doc update alongside the commit message rather than silently skipping it. Small/mechanical changes (typo fixes, refactors with no behavior change, dependency bumps) don't need this.
