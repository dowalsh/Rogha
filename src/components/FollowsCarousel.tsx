// src/components/FollowsCarousel.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Plus, Loader2, X, UserMinus } from "lucide-react";
import { toast } from "react-hot-toast";

type FollowedUser = {
  id: string;
  name?: string | null;
  username?: string | null;
  image?: string | null;
};

type Props = { refreshKey?: number };

export function FollowsCarousel({ refreshKey = 0 }: Props) {
  const [users, setUsers] = useState<FollowedUser[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Add-follow UI
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  // Unfollow state
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/follows", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch (e: any) {
      console.error("[FollowsCarousel] load failed:", e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function handleAddFollow() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      toast.error("Enter an email to follow");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || res.statusText);
      toast.success(
        data?.alreadyFollowing ? "Already following" : "Follow added"
      );
      setEmail("");
      setShowAdd(false);
      await load();
    } catch (e: any) {
      console.error("[FollowsCarousel] add failed:", e);
      toast.error(e?.message || "Failed to follow");
    } finally {
      setAdding(false);
    }
  }

  async function handleConfirmUnfollow() {
    if (!confirmId) return;
    const targetId = confirmId;
    setDeletingId(targetId);
    try {
      const res = await fetch("/api/follows", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: targetId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || res.statusText);
      toast.success("Unfollowed");
      setConfirmId(null);
      await load();
    } catch (e: any) {
      console.error("[FollowsCarousel] unfollow failed:", e);
      toast.error(e?.message || "Failed to unfollow");
    } finally {
      setDeletingId(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!adding) void handleAddFollow();
    } else if (e.key === "Escape") {
      setShowAdd(false);
      setEmail("");
    }
  }

  return (
    <div className="rounded-md border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium">Following</div>

        {showAdd ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              type="email"
              placeholder="Email to follow"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 w-56"
            />
            <Button
              size="sm"
              onClick={handleAddFollow}
              disabled={adding}
              className="gap-1"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add
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
            New follow
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : !users || users.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          You aren’t following anyone yet.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {users.map((u) => {
            const name = u.name || u.username || "Unknown";
            const initials = (name || "U")
              .split(" ")
              .map((s) => s[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            const href = u.username ? `/u/${u.username}` : `/u/${u.id}`;
            const isDeleting = deletingId === u.id;

            return (
              <div
                key={u.id}
                className="group relative flex min-w-[220px] items-center gap-3 rounded-md border px-3 py-2 hover:bg-muted"
              >
                {/* Discreet Unfollow (shows on hover) */}
                <AlertDialog
                  open={confirmId === u.id}
                  onOpenChange={(open) => setConfirmId(open ? u.id : null)}
                >
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-1 top-1 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 z-10"
                      title="Unfollow"
                      // ⬅️ remove the preventDefault/stopPropagation here
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
                      <AlertDialogTitle>Unfollow {name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You’ll stop seeing this person in your following list.
                        You can follow again later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault();
                          if (!isDeleting) void handleConfirmUnfollow();
                        }}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Unfollow"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                {/* Clickable area to profile */}
                <Link href={href} className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={u.image ?? undefined} alt={name} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{name}</span>
                    {u.username && (
                      <span className="truncate text-xs text-muted-foreground">
                        @{u.username}
                      </span>
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
