import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

function handleDeepLink(url: string) {
  if (!url.startsWith("rogha://")) return;

  window.location.href = "/";
}

export async function initDeepLinks(): Promise<PluginListenerHandle | null> {
  if (!Capacitor.isNativePlatform()) return null;

  const handle = await App.addListener("appUrlOpen", ({ url }) => {
    if (url) handleDeepLink(url);
  });

  const launchUrl = await App.getLaunchUrl();
  // Skip rogha://auth — it's only a signal to return from OAuth, not a cold-launch destination.
  // Processing it here causes an infinite reload loop since Capacitor caches getLaunchUrl for the entire app session.
  if (launchUrl?.url && launchUrl.url !== "rogha://auth") {
    handleDeepLink(launchUrl.url);
  }

  return handle;
}
