"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { X, Search } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/Spinner";
import { CirclePill } from "@/components/circles/CirclePill";
import {
  addMemberToCircle,
  removeMemberFromCircle,
  leaveCircle,
} from "@/actions/circle.action";
import { getFriends } from "@/actions/friends.action";

type CircleInvite = { code: string; url: string; expiresAt: string };

function InviteSection({ circleId, circleName }: { circleId: string; circleName: string }) {
  const [invite, setInvite] = useState<CircleInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [customCode, setCustomCode] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/circles/${circleId}/invite`)
      .then((r) => r.json())
      .then((data) => setInvite(data.invite ?? null))
      .finally(() => setLoading(false));
  }, [circleId]);

  const createInvite = async (replaceExisting: boolean) => {
    if (replaceExisting && !confirm("This retires the current link/code. Continue?")) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/circles/${circleId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customCode: customCode.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create invite");
      setInvite(data.invite);
      setCustomCode("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create invite");
    } finally {
      setCreating(false);
    }
  };

  const shareText = (i: CircleInvite) =>
    `Join ${circleName} on Rogha! ${i.url} (code: ${i.code})`;

  const share = async (i: CircleInvite) => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText(i) });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(shareText(i));
    toast.success("Copied invite to clipboard");
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <Spinner className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-medium mb-2">Invite</h3>
      {invite ? (
        <div className="space-y-2">
          <p className="text-sm">
            Code: <span className="font-mono">{invite.code}</span>
          </p>
          <p className="text-xs text-muted-foreground break-all">{invite.url}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => share(invite)}>
              Share
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={creating}
              onClick={() => createInvite(true)}
            >
              Create new
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value)}
            placeholder={`e.g. ${circleName.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`}
          />
          <Button size="sm" disabled={creating} onClick={() => createInvite(false)}>
            {creating ? "Creating..." : "Create invite"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function CircleDialog({
  circle,
  open,
  onClose,
  onMembersChanged, // renamed
}: {
  circle: any;
  open: boolean;
  onClose: () => void;
  onMembersChanged?: (members: { user: any }[]) => void;
}) {
  // ❌ remove this early return — allow empty-members circles
  // if (!circle?.members || circle.members.length === 0) return null;

  const [members, setMembers] = useState<{ user: any }[]>(
    circle?.members ?? []
  );
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());

  // keep members in sync when a new circle is selected
  useEffect(() => {
    setMembers(circle?.members ?? []);
  }, [circle?.id]); // re-run when switching circles

  // load friends only when dialog opens (saves a fetch)
  useEffect(() => {
    if (!open) return;
    setLoadingFriends(true);
    getFriends().then(setFriends).finally(() => setLoadingFriends(false));
  }, [open]);

  // reset the picker state whenever the dialog is reopened
  useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedToAdd(new Set());
    }
  }, [open]);

  const handleRemove = async (memberId: string) => {
    await removeMemberFromCircle(circle.id, memberId);
    setMembers((prev) => {
      const next = prev.filter((m) => m.user.id !== memberId);
      onMembersChanged?.(next);
      return next;
    });
  };

  const toggleSelectedToAdd = (friendId: string) => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else next.add(friendId);
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (selectedToAdd.size === 0) return;
    setIsAdding(true);
    try {
      const idsToAdd = Array.from(selectedToAdd);
      await Promise.all(
        idsToAdd.map((friendId) =>
          addMemberToCircle({ circleId: circle.id, friendId })
        )
      );
      const addedFriends = friends.filter((f) => idsToAdd.includes(f.id));
      setMembers((prev) => {
        const next = [...prev, ...addedFriends.map((friend) => ({ user: friend }))];
        onMembersChanged?.(next);
        return next;
      });
      setSelectedToAdd(new Set());
      setSearch("");
    } finally {
      setIsAdding(false);
    }
  };

  // const handleLeave = async () => {
  //   if (!confirm("Leave this circle?")) return;
  //   await leaveCircle(circle.id);
  //   onClose();
  //   onChanged?.();
  // };

  const currentMemberIds = members.map((m) => m.user.id);
  const addableFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    return friends
      .filter((f) => !currentMemberIds.includes(f.id))
      .filter((f) => !q || f.username?.toLowerCase().includes(q));
  }, [friends, currentMemberIds, search]);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose(); // only close if the user actually closes it
      }}
    >
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {circle?.name ? <CirclePill name={circle.name} /> : "Circle"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {circle?.id && <InviteSection circleId={circle.id} circleName={circle.name} />}

          <div>
            <h3 className="font-medium mb-2">Members</h3>
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {members.map((m) => (
                <li
                  key={m.user.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={m.user.image} />
                      <AvatarFallback>{m.user.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                    </Avatar>
                    <span>{m.user.username}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(m.user.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-2">Add friends</h3>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search friends..."
                className="pl-8"
              />
            </div>

            {loadingFriends ? (
              <div className="flex justify-center p-4">
                <Spinner className="h-4 w-4" />
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto flex flex-col gap-1 rounded-md border">
                {addableFriends.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-2 py-4 text-center">
                    No friends found
                  </p>
                ) : (
                  addableFriends.map((friend) => {
                    const checked = selectedToAdd.has(friend.id);
                    return (
                      <label
                        key={friend.id}
                        className="flex items-center gap-3 px-2 py-2 cursor-pointer hover:bg-muted"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleSelectedToAdd(friend.id)}
                        />
                        <Avatar className="w-6 h-6 shrink-0">
                          <AvatarImage src={friend.image} />
                          <AvatarFallback>
                            {friend.username?.[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm">{friend.username}</span>
                      </label>
                    );
                  })
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {selectedToAdd.size} selected
              </p>
              <Button
                size="sm"
                onClick={handleAddSelected}
                disabled={selectedToAdd.size === 0 || isAdding}
              >
                {isAdding
                  ? "Adding..."
                  : `Add${selectedToAdd.size > 0 ? ` (${selectedToAdd.size})` : ""}`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
