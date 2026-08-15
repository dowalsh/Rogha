"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export type RepublishTarget =
  | { mode: "fromPost"; postId: string }
  | { mode: "fromFriend"; friendId: string; friendName: string }
  | { mode: "browse" };

type Friend = { id: string; username: string; image: string | null };
type MyPost = { id: string; title: string | null; status: string; heroImageUrl: string | null };
type Candidate = {
  id: string;
  title: string | null;
  heroThumbUrl: string | null;
  eligibleCount: number;
};

function initialsFor(username: string | null) {
  return (username || "?").slice(0, 2).toUpperCase();
}

// Shared republish flow, opened from two contexts: a specific post
// ("fromPost" — reader page / My Posts) or a just-accepted friend
// ("fromFriend" — picks a post first, friend pre-highlighted but still
// requires an explicit tap to add, per the spec).
export function RepublishModal({
  target,
  onClose,
  onSent,
}: {
  target: RepublishTarget | null;
  onClose: () => void;
  onSent?: () => void;
}) {
  const open = target !== null;

  const [postId, setPostId] = useState<string | null>(
    target?.mode === "fromPost" ? target.postId : null,
  );
  const [myPosts, setMyPosts] = useState<MyPost[] | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const [eligibility, setEligibility] = useState<{
    rationAvailable: boolean;
    hasFriends: boolean;
    friends: Friend[];
  } | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  // Reset on every open/target change.
  useEffect(() => {
    if (!target) return;
    setSelected(new Set());
    setEligibility(null);
    if (target.mode === "fromPost") {
      setPostId(target.postId);
      setMyPosts(null);
      setCandidates(null);
    } else if (target.mode === "fromFriend") {
      setPostId(null);
      setCandidates(null);
      setLoadingPosts(true);
      fetch("/api/posts", { credentials: "include" })
        .then((r) => r.json())
        .then((posts: MyPost[]) =>
          setMyPosts(posts.filter((p) => p.status === "PUBLISHED")),
        )
        .catch(() => setMyPosts([]))
        .finally(() => setLoadingPosts(false));
    } else {
      // browse
      setPostId(null);
      setMyPosts(null);
      setLoadingCandidates(true);
      fetch("/api/republish/candidates", { credentials: "include" })
        .then((r) => r.json())
        .then((body: { posts: Candidate[] }) => setCandidates(body.posts ?? []))
        .catch(() => setCandidates([]))
        .finally(() => setLoadingCandidates(false));
    }
  }, [target]);

  // Fetch eligibility once a post is chosen.
  useEffect(() => {
    if (!postId) return;
    setLoadingEligibility(true);
    fetch(`/api/posts/${postId}/republish`, { credentials: "include" })
      .then((r) => r.json())
      .then(setEligibility)
      .catch(() => setEligibility({ rationAvailable: false, hasFriends: false, friends: [] }))
      .finally(() => setLoadingEligibility(false));
  }, [postId]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!postId || selected.size === 0) return;
    setSending(true);
    try {
      const res = await fetch(`/api/posts/${postId}/republish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientIds: Array.from(selected) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || body?.error || res.statusText);
      const names: string[] = body.recipientNames ?? [];
      toast.success(`Queued for Sunday — ${names.join(", ")} will see it in this week's edition.`);
      onSent?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Failed to republish");
    } finally {
      setSending(false);
    }
  };

  const friendHighlightId = target?.mode === "fromFriend" ? target.friendId : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Republish</DialogTitle>
        </DialogHeader>

        {/* Step 1 (fromFriend only): pick a post */}
        {target?.mode === "fromFriend" && !postId && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Which of your posts should {target.friendName} see?
            </p>
            {loadingPosts ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : myPosts && myPosts.length > 0 ? (
              <div className="max-h-72 overflow-y-auto flex flex-col gap-1">
                {myPosts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPostId(p.id)}
                    className="flex items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span className="truncate">{p.title ?? "Untitled post"}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                You don't have any published posts yet.
              </p>
            )}
          </div>
        )}

        {/* Step 1 (browse only): shortlist of posts with someone eligible */}
        {target?.mode === "browse" && !postId && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Pick one of your posts to give to a friend who hasn't seen it yet.
            </p>
            {loadingCandidates ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : candidates && candidates.length > 0 ? (
              <div className="max-h-72 overflow-y-auto flex flex-col gap-1">
                {candidates.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPostId(p.id)}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span className="truncate">{p.title ?? "Untitled post"}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {p.eligibleCount} friend{p.eligibleCount === 1 ? "" : "s"} haven't seen it
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                Every friend has already seen everything you've published — nothing to
                republish right now.
              </p>
            )}
          </div>
        )}

        {/* Step 2: recipient checklist */}
        {postId && (
          <div className="space-y-3">
            {loadingEligibility ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : !eligibility ? null : !eligibility.rationAvailable ? (
              <p className="text-sm text-muted-foreground py-4">
                You've already republished this week — your next one unlocks Sunday.
              </p>
            ) : eligibility.friends.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Everyone you're friends with has already seen this one.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Pick who should see it — friends who joined after it published.
                </p>
                <div className="max-h-72 overflow-y-auto flex flex-col gap-1">
                  {eligibility.friends.map((f) => {
                    const checked = selected.has(f.id);
                    return (
                      <label
                        key={f.id}
                        className={`flex items-center gap-3 rounded-md px-2 py-2 cursor-pointer hover:bg-muted ${
                          f.id === friendHighlightId ? "ring-1 ring-blue-500/50" : ""
                        }`}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggle(f.id)} />
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={f.image ?? undefined} alt={f.username} />
                          <AvatarFallback>{initialsFor(f.username)}</AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm">{f.username}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selected.size} selected
                </p>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {postId && eligibility?.rationAvailable && eligibility.friends.length > 0 && (
            <Button onClick={handleConfirm} disabled={selected.size === 0 || sending}>
              {sending ? "Sending..." : "Confirm"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
