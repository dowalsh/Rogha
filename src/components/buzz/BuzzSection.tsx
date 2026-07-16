// src/components/buzz/BuzzSection.tsx
"use client";

import useSWR from "swr";
// import { Capacitor } from "@capacitor/core";
// import { App } from "@capacitor/app";
import { BuzzFeed } from "./BuzzFeed";
import type { BuzzItemProps } from "./BuzzItem";

export function BuzzSection() {
  // Cached across navigation: returning to the home feed shows the last
  // fetched buzz items instantly while a revalidation happens in the
  // background, instead of a cold refetch every time.
  const {
    data: items = [],
    isLoading,
    error,
    mutate: refreshFeed,
  } = useSWR<BuzzItemProps[]>("/api/buzz");

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
      onRefresh={() => refreshFeed()}
      headerSlot={
        error ? (
          <span className="text-xs text-destructive">
            {error.message ?? "Failed to load buzz"}
          </span>
        ) : null
      }
    />
  );
}
