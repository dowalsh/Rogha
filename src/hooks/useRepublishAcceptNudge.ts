"use client";

import { useState } from "react";

export type RepublishAcceptPrompt = { id: string; username: string };

// Shared state/logic behind the "share an old favourite" nudge that appears
// right after accepting a friend request — used by both PendingRequestsCard
// (home page) and FriendsCarousel (/circles). Taking the prompt just routes
// to /posts (its permanent Republish entry point already sorts eligible
// friends by most-recently-accepted, so the friend you just added surfaces
// at the top on its own — no separate friend-first flow needed).
export function useRepublishAcceptNudge() {
  const [prompt, setPrompt] = useState<RepublishAcceptPrompt | null>(null);

  // Call after a successful accept. Only surfaces the prompt if a republish
  // ration is actually available (see docs/specs/2026-08-13-republish.md) —
  // no point nudging into a dead end.
  function checkAfterAccept(userId: string, username: string) {
    fetch("/api/republish/status", { credentials: "include" })
      .then((r) => r.json())
      .then((s: { available: boolean }) => {
        if (s.available) setPrompt({ id: userId, username });
      })
      .catch(() => {});
  }

  function dismiss() {
    setPrompt(null);
  }

  return { prompt, checkAfterAccept, dismiss };
}
