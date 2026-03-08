import { App } from "@capacitor/app";

function handleDeepLink(url: string) {
  if (!url.startsWith("rogha://")) return;

  window.location.reload();
}

export async function initDeepLinks() {
  App.addListener("appUrlOpen", ({ url }) => {
    if (url) handleDeepLink(url);
  });

  const launchUrl = await App.getLaunchUrl();
  if (launchUrl?.url) handleDeepLink(launchUrl.url);
}
