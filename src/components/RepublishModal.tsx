"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const MAX_MESSAGE_LENGTH = 500;

export type RepublishTarget = { postId: string };

type Friend = { id: string; username: string; image: string | null };

function initialsFor(username: string | null) {
  return (username || "?").slice(0, 2).toUpperCase();
}

// The friend-picker dialog, opened for a specific post — from the reader
// page's Republish button or a My Posts row's Republish action. Friends are
// sorted most-recently-accepted first (see getRepublishEligibleFriends), so
// a friend you just added surfaces at the top without any special handling
// here.
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
  const postId = target?.postId ?? null;

  // Same signoff-emoji treatment as the standard post-submit toast
  // (src/app/editor/[id]/page.tsx) — a republish is a submit under the hood.
  const { data: me } = useSWR<{ signoffEmoji: string | null }>(
    open ? "/api/me" : null,
  );

  const [eligibility, setEligibility] = useState<{
    rationAvailable: boolean;
    hasFriends: boolean;
    friends: Friend[];
  } | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Reset + fetch eligibility on every open.
  useEffect(() => {
    if (!postId) return;
    setSelected(new Set());
    setMessage("");
    setEligibility(null);
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
        body: JSON.stringify({
          recipientIds: Array.from(selected),
          message: message.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || body?.error || res.statusText);
      const emoji = me?.signoffEmoji;
      toast.success(emoji ? `Submitted ${emoji}` : "Submitted");
      onSent?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Failed to republish");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Republish</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {loadingEligibility ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !eligibility ? null : !eligibility.rationAvailable ? (
            <p className="text-sm text-muted-foreground py-4">
              You've already republished this week! (you only get one per week)
            </p>
          ) : eligibility.friends.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Everyone you're friends with has already seen this post!
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Who should this post be republished to? Choose from the friends below who
                haven't seen this one yet.
              </p>
              <div className="max-h-72 overflow-y-auto flex flex-col gap-1">
                {eligibility.friends.map((f) => {
                  const checked = selected.has(f.id);
                  return (
                    <label
                      key={f.id}
                      className="flex items-center gap-3 rounded-md px-2 py-2 cursor-pointer hover:bg-muted"
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
              <div className="space-y-1">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                  placeholder="Optional republish message to accompany your post"
                  className="min-h-20 resize-none"
                  maxLength={MAX_MESSAGE_LENGTH}
                />
                <p className="text-right text-xs text-muted-foreground">
                  {message.length}/{MAX_MESSAGE_LENGTH}
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {eligibility?.rationAvailable && eligibility.friends.length > 0 && (
            <Button onClick={handleConfirm} disabled={selected.size === 0 || sending}>
              {sending ? "Sending..." : "Confirm"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
