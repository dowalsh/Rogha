"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "react-hot-toast";
import { Plus, Loader2, X, UserMinus, Check, Clock } from "lucide-react";

type FriendState = "ACCEPTED" | "PENDING_OUTGOING" | "PENDING_INCOMING";

type FriendItem = {
  state: FriendState;
  createdAt: string;
  acceptedAt: string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

type Props = { refreshKey?: number };

export function FriendsCarousel({ refreshKey = 0 }: Props) {
  const [items, setItems] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-friend UI
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  // Unfriend dialog state
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Accept/Decline button spinners (keyed by user id)
  const [actingId, setActingId] = useState<string | null>(null);

  const loadBox = useCallback(
    async (box: "accepted" | "incoming" | "outgoing") => {
      const res = await fetch(`/api/friends?box=${box}`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const arr: FriendItem[] = Array.isArray(data?.items) ? data.items : [];
      return arr;
    },
    []
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [accepted, incoming, outgoing] = await Promise.all([
        loadBox("accepted"),
        loadBox("incoming"),
        loadBox("outgoing"),
      ]);
      // Merge and sort by createdAt desc so newest stuff is surfaced
      const merged = [...incoming, ...outgoing, ...accepted].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setItems(merged);
    } catch (e: any) {
      console.error("[FriendsCarousel] load failed:", e);
      setItems([]);
      toast.error(e?.message || "Failed to load friends");
    } finally {
      setLoading(false);
    }
  }, [loadBox]);

  useEffect(() => {
    loadAll();
  }, [loadAll, refreshKey]);

  async function handleAddFriend() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      toast.error("Enter an email");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201 && data?.state === "PENDING_OUTGOING") {
        toast.success("Friend request sent");
      } else if (
        res.status === 200 &&
        data?.code === "friends.REQUEST_ALREADY_PENDING"
      ) {
        toast("Request already pending");
      } else if (!res.ok) {
        throw new Error(data?.message || data?.error || res.statusText);
      } else {
        toast("Request sent");
      }
      setEmail("");
      setShowAdd(false);
      await loadAll();
    } catch (e: any) {
      console.error("[FriendsCarousel] add failed:", e);
      toast.error(e?.message || "Failed to send request");
    } finally {
      setAdding(false);
    }
  }

  async function handleUnfriend(userId: string) {
    setDeletingId(userId);
    try {
      const res = await fetch(`/api/friends/${userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.message || data?.error || res.statusText);
      toast.success("Removed from friends");
      setConfirmId(null);
      await loadAll();
    } catch (e: any) {
      console.error("[FriendsCarousel] unfriend failed:", e);
      toast.error(e?.message || "Failed to unfriend");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAccept(userId: string) {
    setActingId(userId);
    try {
      const res = await fetch(`/api/friends/${userId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.message || data?.error || res.statusText);
      toast.success("Friend request accepted");
      await loadAll();
    } catch (e: any) {
      console.error("[FriendsCarousel] accept failed:", e);
      toast.error(e?.message || "Failed to accept");
    } finally {
      setActingId(null);
    }
  }

  async function handleDecline(userId: string) {
    setActingId(userId);
    try {
      const res = await fetch(`/api/friends/${userId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.message || data?.error || res.statusText);
      toast("Request declined");
      await loadAll();
    } catch (e: any) {
      console.error("[FriendsCarousel] decline failed:", e);
      toast.error(e?.message || "Failed to decline");
    } finally {
      setActingId(null);
    }
  }

  const hasAny = useMemo(() => items.length > 0, [items]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!adding) void handleAddFriend();
    } else if (e.key === "Escape") {
      setShowAdd(false);
      setEmail("");
    }
  }

  return (
    <div className="rounded-md border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium">Friends</div>

        {showAdd ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              type="email"
              placeholder="Add by email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 w-56"
            />
            <Button
              size="sm"
              onClick={handleAddFriend}
              disabled={adding}
              className="gap-1"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Send
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowAdd(false);
                setEmail("");
              }}
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1">
            <Plus className="h-4 w-4" />
            Add friend
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : !hasAny ? (
        <div className="text-sm text-muted-foreground">
          No friends or requests yet. Send a request to someone!
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {items.map((item) => {
            const u = item.user;
            const name = u.name || "Unknown";
            const initials = (name || "U")
              .split(" ")
              .map((s) => s[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            const href = `/u/${u.id}`;
            const isDeleting = deletingId === u.id;
            const isActing = actingId === u.id;

            const isPending =
              item.state === "PENDING_INCOMING" ||
              item.state === "PENDING_OUTGOING";

            return (
              <div
                key={u.id}
                className={[
                  "group relative flex min-w-[240px] items-center gap-3 rounded-md border px-3 py-2",
                  isPending ? "bg-muted/60 shadow-sm" : "hover:bg-muted",
                ].join(" ")}
              >
                {/* Unfriend (accepted only) */}
                {item.state === "ACCEPTED" && (
                  <AlertDialog
                    open={confirmId === u.id}
                    onOpenChange={(open) => setConfirmId(open ? u.id : null)}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 top-1 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 z-10"
                        title="Unfriend"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserMinus className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Remove {name} as a friend?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          You’ll stop seeing their posts in your editions. You
                          can send a request again later.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.preventDefault();
                            if (!isDeleting) void handleUnfriend(u.id);
                          }}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Remove"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Clickable area to profile */}
                <Link href={href} className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={u.image ?? undefined} alt={name} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {item.state === "ACCEPTED"
                        ? "Friend"
                        : item.state === "PENDING_INCOMING"
                        ? "Wants to be friends!"
                        : "Pending"}
                    </span>
                  </div>
                </Link>

                {/* Inline actions for pending */}
                {item.state === "PENDING_INCOMING" ? (
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 px-2"
                      onClick={() => handleAccept(u.id)}
                      disabled={isActing}
                      title="Accept"
                    >
                      {isActing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() => handleDecline(u.id)}
                      disabled={isActing}
                      title="Decline"
                    >
                      {isActing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ) : item.state === "PENDING_OUTGOING" ? (
                  <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Pending
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
