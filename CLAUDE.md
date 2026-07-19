# Rogha — Claude guidelines

## After every code change

Always end the response with a clear list of the files changed and a suggested commit message.

## When a feature is being finalized (commit recommended)

Before wrapping up, check whether the change is significant enough to warrant updating docs/ for future reference — e.g. new/changed product behavior (docs/product-spec.md), a new architectural pattern or module (docs/architecture.md), a data model change (docs/data-model.md), or a new non-trivial feature worth its own spec (docs/specs/). If so, propose the specific doc update alongside the commit message rather than silently skipping it. Small/mechanical changes (typo fixes, refactors with no behavior change, dependency bumps) don't need this.

## Always state how deep the change needs testing

This app has three layers that don't all refresh together: the Next.js dev server, the deployed web app (served live into the native shell via `capacitor.config.ts`'s `server.url`), and the compiled native iOS binary (Capacitor plugins, `capacitor.config.ts` native config, `Info.plist`/Xcode project settings). A change to one doesn't imply the others picked it up. After every change, say explicitly which of these need to happen before it can be verified:
- Testable in the dev server / regular browser as-is.
- Needs a web deploy (to wherever `CAP_SERVER_URL`/`server.url` points) before it's visible in the native app — true for any plain component/page/API change.
- Needs an Xcode rebuild + reinstall (`npx cap sync ios` alone is not enough — that only updates local `ios/` project files, not the binary on-device) — true for anything touching `capacitor.config.ts`, native plugins, `Info.plist`, or the Xcode project itself.

Don't leave this implicit or assume the user will infer it — call it out the same way you call out the changed-files list.
