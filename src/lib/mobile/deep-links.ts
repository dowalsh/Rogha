import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

function handleDeepLink(url: string) {
  if (!url.startsWith("rogha://")) return;

  // Capacitor caches getLaunchUrl and replays appUrlOpen to every new listener for the entire
  // app session. Dedup against sessionStorage so a page reload doesn't re-trigger the same URL.
  const lastHandled = sessionStorage.getItem("rogha_deep_link_last");
  if (lastHandled === url) return;
  sessionStorage.setItem("rogha_deep_link_last", url);

  console.log("[Rogha debug] appUrlOpen:", url);
  Browser.close(); // dismiss SFSafariViewController — it won't close itself on custom schemes

  const parsed = new URL(url.replace("rogha://", "https://rogha.placeholder/"));
  const ticket = parsed.searchParams.get("ticket");

  if (ticket) {
    console.log("[Rogha debug] handleDeepLink: routing to native-callback with ticket");
    window.location.href = `/auth/native-callback?ticket=${encodeURIComponent(ticket)}`;
  } else {
    console.log("[Rogha debug] handleDeepLink: routing to /");
    window.location.href = "/";
  }
}

export async function initDeepLinks(): Promise<PluginListenerHandle | null> {
  if (!Capacitor.isNativePlatform()) return null;

  const handle = await App.addListener("appUrlOpen", ({ url }) => {
    if (url) handleDeepLink(url);
  });

  const launchUrl = await App.getLaunchUrl();
  console.log("[Rogha debug] getLaunchUrl:", launchUrl?.url ?? "(none)");
  // Skip rogha://auth — it's only a signal to return from OAuth, not a cold-launch destination.
  // Processing it here causes an infinite reload loop since Capacitor caches getLaunchUrl for the entire app session.
  if (launchUrl?.url && !launchUrl.url.startsWith("rogha://auth")) {
    handleDeepLink(launchUrl.url);
  }

  return handle;
}
