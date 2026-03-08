"use client";
import { useEffect } from "react";
import { initDeepLinks } from "@/lib/mobile/deep-links";

export default function DeepLinkInit() {
  useEffect(() => {
    initDeepLinks();
  }, []);
  return null;
}
