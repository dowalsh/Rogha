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
