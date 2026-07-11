# Spec: make native sign-in origin-aware

**Status:** ready to implement
**Scope:** small, surgical. 3 call sites + 1 tiny helper.
**Prod risk:** effectively zero (see "Why this is safe for production"). This is a no-op for the current App Store build and only changes behavior for future non-prod builds.

---

## Goal

Make the native (iOS/Capacitor) sign-in flow open the **origin the app is currently running on**, instead of the hardcoded production domain. This is the prerequisite that lets a future *preview/staging* build of the iOS app authenticate against the staging environment. Right now, even a staging build would bounce the user to prod for sign-in, which breaks auth because staging runs a different Clerk instance and a different database.

We are doing **only** this origin change first, in isolation, and verifying prod is unaffected — before any of the separate-app-build work (bundle ID, URL scheme, TestFlight). Keeping it isolated is what makes it safe to ship to prod ahead of the rest.

## Background: how native sign-in works today

The iOS app is a Capacitor shell that loads the web app from a remote URL (`server.url` = `CAP_SERVER_URL`, default `https://rogha.dylanwalsh.ie`). Sign-in inside the native WebView can't happen inline (OAuth needs the real Safari cookie context), so the flow hands off to an in-app browser and back via a deep link:

1. In the native app, the user taps **Sign In**. The app calls `Browser.open({ url: "https://rogha.dylanwalsh.ie/sign-in?fromApp=1" })` (Capacitor `@capacitor/browser`), opening SFSafariViewController on the web sign-in page.
2. The user authenticates with Clerk in that browser.
3. Clerk redirects to `/auth/return-to-app?fromApp=1&redirect=…` (`forceRedirectUrl`, set in `sign-in/page.tsx`).
4. `return-to-app` fetches `/api/auth/mobile-ticket` → a short-lived Clerk sign-in token → redirects to the custom scheme `rogha://auth?ticket=…&redirect=…`, which reopens the native app.
5. `DeepLinkInit` routes that to `/auth/native-callback`, which consumes the ticket (`signIn.create({ strategy: "ticket" })`) and sets the active session in the WebView.

The **only** environment-specific hardcoding that breaks staging is step 1: the browser is always opened at the production domain. Everything else is already environment-correct:
- `mobile-ticket` uses `clerkClient()` → the deployment's own `CLERK_SECRET_KEY` (auto per-env).
- `native-callback` uses Clerk's client hooks → the deployment's own publishable key (auto per-env).

So the ticket is minted and consumed within whatever origin the browser was opened on. Fix the origin in step 1 and the whole chain follows the right environment.

## In scope: the three hardcoded sign-in URLs

All three open the in-app browser at the prod sign-in page. Change each to use the current origin.

1. **`src/app/sign-in/[[...sign-in]]/page.tsx`** (~line 64)
   ```ts
   // before
   const url = `https://rogha.dylanwalsh.ie/sign-in?fromApp=1&redirect=${encodeURIComponent(redirect)}`;
   // after
   const url = `${getAppOrigin()}/sign-in?fromApp=1&redirect=${encodeURIComponent(redirect)}`;
   ```

2. **`src/components/MobileNavbar.tsx`** (~line 196)
   ```ts
   // before
   Browser.open({ url: "https://rogha.dylanwalsh.ie/sign-in?fromApp=1", presentationStyle: "popover" });
   // after
   Browser.open({ url: `${getAppOrigin()}/sign-in?fromApp=1`, presentationStyle: "popover" });
   ```

3. **`src/components/DesktopNavbar.tsx`** (~line 123)
   ```ts
   // before
   Browser.open({ url: "https://rogha.dylanwalsh.ie/sign-in?fromApp=1", presentationStyle: "popover" });
   // after
   Browser.open({ url: `${getAppOrigin()}/sign-in?fromApp=1`, presentationStyle: "popover" });
   ```

### Suggested helper

Add a tiny client-only helper so intent is explicit and there's one place to add an override later:

```ts
// src/lib/mobile/appOrigin.ts
/**
 * The origin the app is currently running on. In the native Capacitor WebView
 * this is the remote `server.url` the shell loaded (prod or a preview/staging
 * build's CAP_SERVER_URL). On the web it's just the site's own origin.
 *
 * Used to keep the native sign-in hand-off on the same environment the app is
 * running against, instead of hardcoding production.
 */
export function getAppOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  // SSR fallback — not expected to be hit (all call sites are client-side event
  // handlers/effects), but keeps the prod domain as a safe default just in case.
  return "https://rogha.dylanwalsh.ie";
}
```

All three call sites are inside `"use client"` components and fire from event handlers / effects, so `window` is always defined when they run. The SSR fallback is defensive only.

## Explicitly OUT of scope (do NOT change these now)

These are environment/scheme concerns that belong to the later **separate-app-build** phase, not this change. Touching them now would either break prod or require coordinated native (Info.plist) changes.

- **The `rogha://` custom URL scheme** in `src/app/auth/return-to-app/page.tsx` and the parsing in `src/components/DeepLinkInit.tsx` / `src/lib/mobile/deep-links.ts`. The preview app will eventually need its own scheme (e.g. `roghapreview://`) to avoid colliding with the prod app, but that's a build-config + Info.plist task, done later. Leave `rogha://` as-is.
- **The universal-link prefix check** `url.startsWith("https://rogha.dylanwalsh.ie/")` in `DeepLinkInit.tsx` (line 25) and `deep-links.ts` (line 10). Universal links are bound to the prod associated domain (`applinks:rogha.dylanwalsh.ie`) by the entitlement; they are inherently prod-only and irrelevant to staging. Leave unchanged.
- Bundle ID, URL scheme, `CAP_SERVER_URL` wiring, TestFlight — all the app-build work. Separate spec.

## Why this is safe for production

The key property: **in the production build, `window.location.origin` is exactly `https://rogha.dylanwalsh.ie`.** The Capacitor shell loads the app from `server.url` (prod), so the WebView's origin *is* the prod domain. Therefore `${getAppOrigin()}/sign-in?fromApp=1` produces the byte-identical string that's hardcoded today. The generated URLs don't change at all for the shipped app.

- No behavior change for the current App Store build (native sign-in URL is identical).
- No change for web/browser users (they were never using the native `Browser.open` path; `getAppOrigin()` returns their own origin, which is what web sign-in already uses).
- The only builds that see a *different* value are future preview/staging builds whose `CAP_SERVER_URL` points elsewhere — which is the entire point.

## Testing / acceptance

Prod-safety is the priority; full staging validation comes after the app-build phase.

**Must pass (prod regression):**
- [ ] Web sign-in (desktop + mobile browser) works unchanged.
- [ ] On a build pointed at prod (`CAP_SERVER_URL` unset), native iOS sign-in completes end-to-end: tap Sign In → SFSafariViewController opens `rogha.dylanwalsh.ie/sign-in` → authenticate → returns via `rogha://auth` → session active in the app. Behavior indistinguishable from before.
- [ ] Confirm the three generated URLs are identical to the previous hardcoded strings when `window.location.origin === "https://rogha.dylanwalsh.ie"` (a quick log/assert in a prod-pointed dev build is enough).
- [ ] `redirect` param still preserved through the flow (unchanged logic; just verify).

**Deferred (validate after the separate-app-build phase, not now):**
- Staging build (`CAP_SERVER_URL=<staging>`) opens the staging sign-in and completes auth against the dev Clerk instance. This can't fully pass until the preview app has its own URL scheme, so it's expected to be verified later.

## Rollout note

Because this is a no-op for prod, it can ship on `main` on its own, ahead of the app-build work. That's deliberate: land and verify the origin change in isolation so that when the preview build arrives, auth is already origin-correct and the only new variables are the native build settings.

## Suggested commit message

```
fix(auth): make native sign-in origin-aware

Open the in-app sign-in browser at the current app origin instead of the
hardcoded production domain, so future preview/staging iOS builds
authenticate against their own environment. No-op for prod: the
Capacitor shell's origin is already the prod domain, so generated URLs
are unchanged. Custom-scheme and app-build changes are out of scope.
```
