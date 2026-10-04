"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, MoreHorizontal, ChevronRight, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { PostPreviewRow } from "@/components/PostPreviewRow";
import { CircleMembersSheet } from "@/components/CircleMembersSheet";
import { AvatarStack } from "@/components/circles/AvatarStack";
import { InviteSheet } from "@/components/circles/InviteSheet";
import { renameCircle, leaveCircle } from "@/actions/circle.action";

type Member = { id: string; username: string; image: string | null };
type Post = {
  id: string;
  title: string | null;
  createdAt: string;
  author: { id: string; username: string };
  heroThumbUrl?: string | null;
};

export function CirclePageClient({
  circleId,
  initialName,
  members,
  posts,
  justJoined,
}: {
  circleId: string;
  initialName: string;
  members: Member[];
  posts: Post[];
  justJoined: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(initialName);
  const [savingName, setSavingName] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);

  const saveName = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === name) {
      setRenaming(false);
      setRenameValue(name);
      return;
    }
    setSavingName(true);
    try {
      await renameCircle(circleId, trimmed);
      setName(trimmed);
      setRenaming(false);
    } catch (err: any) {
      toast.error(err.message ?? "Couldn't rename circle");
    } finally {
      setSavingName(false);
    }
  };

  const confirmLeave = async () => {
    setLeaving(true);
    try {
      await leaveCircle(circleId);
      router.push("/friends");
    } catch (err: any) {
      toast.error(err.message ?? "Couldn't leave circle");
      setLeaving(false);
    }
  };

  const write = async () => {
    setCreatingPost(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) throw new Error();
      const { id } = await res.json();
      router.push(`/editor/${id}?circleId=${circleId}`);
    } catch {
      toast.error("Couldn't start a new post — try again");
      setCreatingPost(false);
    }
  };

  const otherMembers = members.length > 0 ? members.length - 1 : 0;

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between py-3">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={() => router.push("/friends")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-1">
            <button
              className="w-full rounded-sm px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => {
                setRenameValue(name);
                setRenaming(true);
              }}
            >
              Rename circle
            </button>
            <button
              className="w-full rounded-sm px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => setLeaveOpen(true)}
            >
              Leave circle
            </button>
          </PopoverContent>
        </Popover>
      </div>

      {/* Circle name + rename */}
      <div className="flex items-center gap-2 py-1">
        {renaming ? (
          <>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="font-serif text-xl h-10"
              autoFocus
              disabled={savingName}
            />
            <Button size="sm" onClick={saveName} disabled={savingName}>
              {savingName ? "Saving…" : "Save"}
            </Button>
          </>
        ) : (
          <>
            <h1 className="font-serif text-3xl tracking-[-0.01em]">{name}</h1>
            {!justJoined && (
              <button
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => {
                  setRenameValue(name);
                  setRenaming(true);
                }}
              >
                Rename
              </button>
            )}
          </>
        )}
      </div>

      {/* Member opener */}
      <button
        className="flex w-full items-center gap-2 py-2 text-left"
        onClick={() => setMembersOpen(true)}
      >
        <AvatarStack members={members} />
        <span className="text-sm text-muted-foreground">
          {members.length} {members.length === 1 ? "person" : "people"}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      <Button className="w-full mt-2" onClick={() => setInviteOpen(true)}>
        Invite
      </Button>

      {/* Just-joined ceremony */}
      {justJoined && (
        <div className="pt-8 pb-2 space-y-2">
          <h2 className="font-serif text-2xl">You&rsquo;re in!</h2>
          <p className="text-sm text-muted-foreground">
            You and {otherMembers} friend{otherMembers === 1 ? "" : "s"} are already here.
            Time to write your debut post? All posts are published on Sunday.
          </p>
        </div>
      )}

      {/* Feed */}
      <div className="pt-8 space-y-1">
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Posts</p>

        <button
          className="flex w-full items-center gap-3 rounded-md border bg-card px-3 py-3 text-left transition-colors hover:bg-accent/50 disabled:opacity-60"
          onClick={write}
          disabled={creatingPost}
        >
          <PenLine className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-serif text-muted-foreground">Write to {name}</span>
        </button>

        {posts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No posts yet</p>
        ) : (
          <div className="divide-y">
            {posts.map((p) => (
              <PostPreviewRow
                key={p.id}
                variant="plain"
                postId={p.id}
                title={p.title ?? "Untitled"}
                authorName={p.author.username}
                metaText={new Date(p.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
                thumbUrl={p.heroThumbUrl}
                href={`/reader/${p.id}`}
              />
            ))}
          </div>
        )}
      </div>

      <CircleMembersSheet
        target={membersOpen ? { title: name, members } : null}
        onClose={() => setMembersOpen(false)}
      />

      <InviteSheet
        circleId={circleId}
        circleName={name}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You&rsquo;ll stop seeing posts from this circle. You can rejoin later with an invite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeave} disabled={leaving}>
              {leaving ? "Leaving…" : "Leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
