# iOS preview app (Rogha Preview)

A second installable iOS app, built from the same codebase, that points at the **staging**
environment instead of production. Distributed admin-only via TestFlight so we can test feature
branches on a real device. The App Store build is unaffected.

The app is a Capacitor shell that loads the web app from a remote `server.url`; a "preview build"
is just a build whose `server.url` is staging (plus a distinct bundle ID and URL scheme so it can
coexist with the prod app and receive its own auth deep-links).

## Xcode structure

- **Configurations** (project level): `Debug`, `Release`, `Release-Preview`.
  - `Release-Preview` is a duplicate of `Release`.
- **Schemes:** `App` (Archive → `Release`) and `App Preview` (Archive → `Release-Preview`).
- The prod App Store build archives the `App` scheme (`Release`). The preview build archives the
  `App Preview` scheme (`Release-Preview`).

## Per-configuration build settings (on the App target)

All three differences are driven by build settings that vary by configuration, so there's **one**
target and **one** Info.plist — no duplicated target.

| Build setting | Debug / Release | Release-Preview | Consumed by |
|---|---|---|---|
| `Product Bundle Identifier` | `ie.dylanwalsh.rogha` | `ie.dylanwalsh.rogha.preview` | installs side-by-side |
| `CUSTOM_URL_SCHEME` (user-defined) | `rogha` | `roghapreview` | Info.plist `CFBundleURLSchemes` → `$(CUSTOM_URL_SCHEME)` |
| `APP_DISPLAY_NAME` (user-defined) | `rogha` | `Rogha Preview` | Info.plist `CFBundleDisplayName` → `$(APP_DISPLAY_NAME)` |

Info.plist references the variables (`$(CUSTOM_URL_SCHEME)`, `$(APP_DISPLAY_NAME)`) rather than
hardcoded values, so each configuration produces the right app identity.

## server.url — Run Script build phase (convention)

`server.url` lives in the generated `capacitor.config.json`, which is **shared** across
configurations, so Xcode build settings can't vary it. Instead, a Run Script build phase rewrites it
for preview builds only.

**Convention for Run Script build phases: reference scripts by `$SRCROOT`, never an absolute path.**
Absolute paths (`/Users/<you>/…`) break on other machines, CI, and if the repo moves.

- Script: `ios/App/scripts/patch-preview-server-url.sh` (shell: `/bin/sh`).
- Build phase contents (exactly):
  ```
  "${SRCROOT}/scripts/patch-preview-server-url.sh"
  ```
  (`$SRCROOT` for the App target = `ios/App`.)
- **Placement:** the phase must run **after** "Copy Bundle Resources" (so the config is already in
  the `.app`) and before code signing (any normal build phase is).
- Behaviour: on `Release-Preview` it sets `server.url` to the staging URL in the *built* bundle's
  `capacitor.config.json` (never the source file); all other configurations are left untouched.
- Staging URL: defaults to `https://staging.rogha.dylanwalsh.ie` in the script; override with a
  `PREVIEW_SERVER_URL` user-defined build setting on `Release-Preview`.

## Auth deep-link scheme (web side)

The auth round-trip returns to the app via `<scheme>://auth`. The web app must emit/parse the scheme
that the running build registered. This is driven by `NEXT_PUBLIC_APP_SCHEME`
(`src/lib/mobile/appScheme.ts`, default `rogha`), set to `roghapreview` on the staging Vercel env.

Touched files (all default to `rogha`, so prod is unchanged):
- `src/app/auth/return-to-app/page.tsx` — emits `${APP_SCHEME}://auth`.
- `src/lib/mobile/deep-links.ts` — matches incoming `${APP_SCHEME}://…`.
- `src/components/DeepLinkInit.tsx` — parses the `${APP_SCHEME}://` ticket URL.

This pairs with the native `CUSTOM_URL_SCHEME` build setting: native **registers** the scheme, web
**calls/parses** it. Both must agree per environment (they do: staging build = `roghapreview` +
`NEXT_PUBLIC_APP_SCHEME=roghapreview`; prod = `rogha` + default).

Out of scope / intentionally prod-only: the universal-link checks
(`url.startsWith("https://rogha.dylanwalsh.ie/")` in `deep-links.ts` / `DeepLinkInit.tsx`). Universal
links are bound to the prod associated domain (`applinks:rogha.dylanwalsh.ie`) by entitlement and
don't fire on the preview app, so they stay hardcoded to prod.

## Remaining steps to ship the preview app

1. Set `NEXT_PUBLIC_APP_SCHEME=roghapreview` on the staging / Preview Vercel environment; redeploy staging.
2. Archive the **App Preview** scheme → upload to App Store Connect under `ie.dylanwalsh.rogha.preview`.
3. Add admins to **TestFlight Internal Testing** (invite-only by Apple ID = the admin-only gate).
4. On first sign-in, promote your staging user to `ADMIN` (see [../preview-testing.md](../preview-testing.md#becoming-admin-on-preview)).

After that, the preview app auto-tracks staging content on every push; only re-archive for native changes.

## Known limitations

- **Push notifications don't work on the preview app** — TestFlight forces production APNs tokens, but
  staging sends via the sandbox host. Expected; see the push note in [../preview-testing.md](../preview-testing.md). Prod push is fine.
