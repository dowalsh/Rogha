"use client";
import { useEffect } from "react";
import type { PluginListenerHandle } from "@capacitor/core";
import { initDeepLinks } from "@/lib/mobile/deep-links";

export default function DeepLinkInit() {
  useEffect(() => {
    let handle: PluginListenerHandle | null = null;
    initDeepLinks().then((h) => {
      handle = h;
    });
    return () => {
      handle?.remove();
    };
  }, []);
  return null;
}
