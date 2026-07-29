"use client";

import useSWR from "swr";

// Small pending-friend-request count badge, meant to sit next to a nav
// icon/label (Friends/Circles). Polls via the shared SWR cache — any
// accept/decline action elsewhere calls mutate("/api/friends?box=incoming"),
// but this is a separate key, so it just revalidates on its own interval.
export function FriendsNavBadge() {
  const { data } = useSWR<{ count: number }>("/api/friends/pending-count", {
    refreshInterval: 60_000,
  });

  const count = data?.count ?? 0;
  if (count === 0) return null;

  return (
    <span className="px-1.5 py-0.5 rounded-full bg-pink-500 text-white text-xs font-medium leading-none">
      {count > 9 ? "9+" : count}
    </span>
  );
}
