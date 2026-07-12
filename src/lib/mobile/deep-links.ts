import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import { APP_SCHEME } from "@/lib/mobile/appScheme";

export type DeepLinkEvent = CustomEvent<{ url: string }>;

function handleDeepLink(url: string) {
  // Universal link — iOS opened the app from an HTTPS email/web link
  if (url.startsWith("https://rogha.dylanwalsh.ie/")) {
    console.log("[Rogha debug] universal link:", url);
    window.dispatchEvent(new CustomEvent("rogha:deeplink", { detail: { url } }));
    return;
  }

  if (!url.startsWith(`${APP_SCHEME}://`)) return;

  // Capacitor replays the cached launch URL to every new appUrlOpen listener. For auth
  // return URLs this causes a reload loop — dedup them. Regular deep links don't need this.
  if (url.startsWith(`${APP_SCHEME}://auth`)) {
    const lastHandled = sessionStorage.getItem("rogha_deep_link_last");
    if (lastHandled === url) return;
    sessionStorage.setItem("rogha_deep_link_last", url);
  }

  console.log("[Rogha debug] appUrlOpen:", url);
  Browser.close(); // dismiss SFSafariViewController — it won't close itself on custom schemes

  window.dispatchEvent(new CustomEvent("rogha:deeplink", { detail: { url } }));
}

export async function initDeepLinks(): Promise<PluginListenerHandle | null> {
  if (!Capacitor.isNativePlatform()) return null;

  const handle = await App.addListener("appUrlOpen", ({ url }) => {
    if (url) handleDeepLink(url);
  });

  const launchUrl = await App.getLaunchUrl();
  console.log("[Rogha debug] getLaunchUrl:", launchUrl?.url ?? "(none)");
  // handleDeepLink's own sessionStorage dedup (above) already guards against Capacitor
  // replaying a cached/stale auth URL, so no need to special-case <scheme>://auth here —
  // doing so used to drop the ticket entirely when iOS cold-launches the app from the
  // deep-link return (e.g. it was evicted from memory while the user was in the popover).
  if (launchUrl?.url) {
    handleDeepLink(launchUrl.url);
  }

  return handle;
}
