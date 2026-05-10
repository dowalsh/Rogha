import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

export type DeepLinkEvent = CustomEvent<{ url: string }>;

function handleDeepLink(url: string) {
  if (!url.startsWith("rogha://")) return;

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
  // Skip rogha://auth* — auth return URLs are not cold-launch destinations, and Capacitor
  // caches getLaunchUrl for the entire app session so we'd re-process stale auth tickets.
  if (launchUrl?.url && !launchUrl.url.startsWith("rogha://auth")) {
    handleDeepLink(launchUrl.url);
  }

  return handle;
}
