"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Users, Gift } from "lucide-react";
import toast from "react-hot-toast";
import { RepublishModal, type RepublishTarget } from "@/components/RepublishModal";

type PendingItem = {
  state: "PENDING_INCOMING";
  createdAt: string;
  user: {
    id: string;
    image: string | null;
    username: string | null;
  };
  mutualCount: number;
};

function initialsFor(username: string | null) {
  return (username || "?").slice(0, 2).toUpperCase();
}

// Pinned to the top of the home page (above the edition hero) whenever
// there's at least one incoming friend request — the "unmissable" surface
// from the request-flow fix in docs/specs/2026-07-28-profiles-and-friends.md.
export function PendingRequestsCard() {
  const { data, mutate, isLoading } = useSWR<{ items: PendingItem[] }>(
    "/api/friends?box=incoming"
  );
  const { mutate: globalMutate } = useSWRConfig();
  const [acting, setActing] = useState<{ userId: string; action: "accept" | "decline" } | null>(
    null
  );
  const [republishPrompt, setRepublishPrompt] = useState<{ id: string; username: string } | null>(
    null,
  );
  const [republishTarget, setRepublishTarget] = useState<RepublishTarget | null>(null);

  const respond = useCallback(
    async (userId: string, action: "accept" | "decline", username: string) => {
      setActing({ userId, action });
      try {
        const res = await fetch(`/api/friends/${userId}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.message || body?.error || res.statusText);
        toast.success(action === "accept" ? "Friend request accepted" : "Request declined");
        await mutate();
        if (action === "accept") {
          // A newly-accepted friend's submitted-for-next-edition posts need
          // to appear in the home feed's "Coming Sunday" section right away.
          await globalMutate("/api/home");
          // Gentle, dismissible "share an old favourite" nudge — only if a
          // republish ration is actually available (see republish spec).
          fetch("/api/republish/status", { credentials: "include" })
            .then((r) => r.json())
            .then((s: { available: boolean }) => {
              if (s.available) setRepublishPrompt({ id: userId, username });
            })
            .catch(() => {});
        }
      } catch (e: any) {
        toast.error(e?.message || `Failed to ${action}`);
      } finally {
        setActing(null);
      }
    },
    [mutate, globalMutate]
  );

  const items = data?.items ?? [];
  if (isLoading || items.length === 0) return null;

  return (
    <div className="rounded-md border p-4 space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Users className="h-4 w-4" />
        {items.length === 1
          ? "1 person wants to connect"
          : `${items.length} people want to connect`}
      </h2>

      <div className="flex flex-col gap-2">
        {items.map(({ user, mutualCount }) => {
          const isActing = acting?.userId === user.id;
          const profileHref = user.username ? `/profile/${user.username}` : "#";

          return (
            <div
              key={user.id}
              className="flex items-center gap-3 rounded-md bg-muted/60 px-3 py-2"
            >
              <Link href={profileHref} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={user.image ?? undefined} alt={user.username ?? ""} />
                  <AvatarFallback>{initialsFor(user.username)}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {user.username}
                  </span>
                  {mutualCount > 0 && (
                    <span className="truncate text-xs text-muted-foreground">
                      {mutualCount} mutual friend{mutualCount === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </Link>

              <div className="flex items-center gap-2 shrink-0">
                {isActing ? (
                  <div className="flex h-8 items-center justify-center px-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <>
                    <Button
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => respond(user.id, "accept", user.username ?? "")}
                    >
                      <Check className="h-4 w-4" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-3"
                      onClick={() => respond(user.id, "decline", user.username ?? "")}
                    >
                      <X className="h-4 w-4" />
                      Decline
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {republishPrompt && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-blue-500/40 bg-blue-50 dark:bg-blue-950/20 px-3 py-2 text-sm">
          <span className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
            <Gift className="h-4 w-4 shrink-0" />
            Share an old favourite with {republishPrompt.username}?
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                setRepublishTarget({
                  mode: "fromFriend",
                  friendId: republishPrompt.id,
                  friendName: republishPrompt.username,
                });
                setRepublishPrompt(null);
              }}
            >
              Share
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-blue-700 dark:text-blue-400"
              onClick={() => setRepublishPrompt(null)}
            >
              Not now
            </Button>
          </div>
        </div>
      )}

      <RepublishModal target={republishTarget} onClose={() => setRepublishTarget(null)} />
    </div>
  );
}
