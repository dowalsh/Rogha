"use client";
import { useEffect } from "react";
import type { PluginListenerHandle } from "@capacitor/core";
import { Capacitor } from "@capacitor/core";
import { initDeepLinks } from "@/lib/mobile/deep-links";

export default function DeepLinkInit() {
  useEffect(() => {
    console.log("[Rogha debug] DeepLinkInit mounted");
    console.log("[Rogha debug] isNative:", Capacitor.isNativePlatform());
    console.log("[Rogha debug] platform:", Capacitor.getPlatform());
    console.log("[Rogha debug] href:", window.location.href);
    console.log(
      "[Rogha debug] Clerk key prefix:",
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.slice(0, 24)
    );

    let handle: PluginListenerHandle | null = null;
    initDeepLinks().then((h) => {
      console.log("[Rogha debug] initDeepLinks handle:", !!h);
      handle = h;
    });
    return () => {
      handle?.remove();
    };
  }, []);
  return null;
}
