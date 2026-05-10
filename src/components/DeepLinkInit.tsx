"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PluginListenerHandle } from "@capacitor/core";
import { Capacitor } from "@capacitor/core";
import { initDeepLinks } from "@/lib/mobile/deep-links";

export default function DeepLinkInit() {
  const router = useRouter();

  useEffect(() => {
    console.log("[Rogha debug] DeepLinkInit mounted");
    console.log("[Rogha debug] isNative:", Capacitor.isNativePlatform());
    console.log("[Rogha debug] platform:", Capacitor.getPlatform());
    console.log("[Rogha debug] href:", window.location.href);
    console.log(
      "[Rogha debug] Clerk key prefix:",
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.slice(0, 24)
    );

    function onDeepLink(e: Event) {
      const { url } = (e as CustomEvent<{ url: string }>).detail;

      // Universal link — navigate directly to the path within the app
      if (url.startsWith("https://rogha.dylanwalsh.ie/")) {
        const { pathname, search } = new URL(url);
        console.log("[Rogha debug] DeepLinkInit: universal link to", pathname);
        router.push(pathname + search);
        return;
      }

      // Custom scheme — auth return with ticket and optional redirect destination
      const parsed = new URL(url.replace("rogha://", "https://rogha.placeholder/"));
      const ticket = parsed.searchParams.get("ticket");
      const redirect = parsed.searchParams.get("redirect") ?? "/";

      if (ticket) {
        console.log("[Rogha debug] DeepLinkInit: routing to native-callback with ticket");
        router.push(
          `/auth/native-callback?ticket=${encodeURIComponent(ticket)}&redirect=${encodeURIComponent(redirect)}`
        );
      } else {
        console.log("[Rogha debug] DeepLinkInit: routing to", redirect);
        router.push(redirect);
      }
    }

    window.addEventListener("rogha:deeplink", onDeepLink);

    let handle: PluginListenerHandle | null = null;
    initDeepLinks().then((h) => {
      console.log("[Rogha debug] initDeepLinks handle:", !!h);
      handle = h;
    });

    return () => {
      window.removeEventListener("rogha:deeplink", onDeepLink);
      handle?.remove();
    };
  }, []);

  return null;
}
