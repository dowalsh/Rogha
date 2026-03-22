// src/components/buzz/BuzzSection.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
// import { Capacitor } from "@capacitor/core";
// import { App } from "@capacitor/app";
import { BuzzFeed } from "./BuzzFeed";
import type { BuzzItemProps } from "./BuzzItem";

export function BuzzSection() {
  const [items, setItems] = useState<BuzzItemProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isRefreshing = useRef(false);

  const refreshFeed = useCallback(async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    setIsLoading(true);
    setError(null);

    if (process.env.NODE_ENV === "development") {
      console.log("[BUZZ REFRESH] Refresh triggered");
    }

    try {
      const res = await fetch("/api/buzz");
      if (!res.ok) throw new Error(`Failed to load buzz (${res.status})`);
      const data: BuzzItemProps[] = await res.json();
      setItems(data);

      if (process.env.NODE_ENV === "development") {
        console.log("[BUZZ REFRESH] Feed updated, items:", data.length);
      }
    } catch (err: any) {
      console.error("[BuzzSection] error loading buzz", err);
      setError(err.message ?? "Failed to load buzz");
    } finally {
      setIsLoading(false);
      isRefreshing.current = false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshFeed();
  }, [refreshFeed]);

  // Web: refresh on tab focus (skip on native — handled by appStateChange)
  // useEffect(() => {
  //   if (Capacitor.isNativePlatform()) return;
  //   window.addEventListener("focus", refreshFeed);
  //   return () => window.removeEventListener("focus", refreshFeed);
  // }, [refreshFeed]);

  // iOS: refresh on app resume
  // useEffect(() => {
  //   if (!Capacitor.isNativePlatform()) return;
  //   let handle: any;
  //   App.addListener("appStateChange", ({ isActive }) => {
  //     if (isActive) refreshFeed();
  //   }).then((h) => (handle = h));
  //   return () => {
  //     handle?.remove();
  //   };
  // }, [refreshFeed]);

  return (
    <BuzzFeed
      items={items}
      isLoading={isLoading}
      onRefresh={refreshFeed}
      headerSlot={
        error ? <span className="text-xs text-destructive">{error}</span> : null
      }
    />
  );
}
