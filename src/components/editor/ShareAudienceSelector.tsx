"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { NewCircleDialog } from "@/components/NewCircleDialog";
import { createCircle } from "@/actions/circle.action";
import { mutate } from "swr";
import { cn } from "@/lib/utils";

type ShareCircle = {
  id: string;
  name: string;
  memberCount: number;
  members: { id: string; username: string; image: string | null }[];
};

const FACE_LIMIT = 5;

function initialsFor(username: string) {
  return username.slice(0, 2).toUpperCase();
}

function FaceRow({
  circle,
  onOpenMembers,
}: {
  circle: ShareCircle;
  onOpenMembers: () => void;
}) {
  const shown = circle.members.slice(0, FACE_LIMIT);
  const overflow = circle.memberCount - shown.length;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpenMembers();
      }}
      className="flex items-center gap-2 py-1 -my-1 pr-2"
    >
      <div className="flex items-center">
        {shown.map((m, i) => (
          <Avatar
            key={m.id}
            className={cn("h-[26px] w-[26px] ring-2 ring-background", i > 0 && "-ml-[7px]")}
          >
            <AvatarImage src={m.image ?? undefined} alt={m.username} />
            <AvatarFallback className="text-[10px]">{initialsFor(m.username)}</AvatarFallback>
          </Avatar>
        ))}
      </div>
      {overflow > 0 && (
        <span className="whitespace-nowrap text-[11.5px] text-muted-foreground">
          and {overflow} more
        </span>
      )}
    </button>
  );
}

function CircleCard({
  circle,
  selected,
  onToggle,
  onOpenMembers,
}: {
  circle: ShareCircle;
  selected: boolean;
  onToggle: () => void;
  onOpenMembers: () => void;
}) {
  return (
    <div
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        "cursor-pointer rounded-xl border px-4 py-3 transition-colors duration-150",
        selected ? "border-foreground bg-muted" : "border-border bg-background",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-semibold">{circle.name}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {circle.memberCount} {circle.memberCount === 1 ? "person" : "people"}
          </div>
        </div>
        <span
          className={cn(
            "mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border",
            selected
              ? "border-foreground bg-foreground text-background"
              : "border-input text-transparent",
          )}
        >
          {selected && (
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3}>
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </div>
      {circle.memberCount > 0 && (
        <div className="mt-[11px]">
          <FaceRow circle={circle} onOpenMembers={onOpenMembers} />
        </div>
      )}
    </div>
  );
}

export function ShareAudienceSelector({
  open,
  onBack,
  audienceType,
  circleIds,
  onChange,
  posting,
  onPost,
}: {
  open: boolean;
  onBack: () => void;
  audienceType: "FRIENDS" | "CIRCLE";
  circleIds: string[];
  onChange: (audienceType: "FRIENDS" | "CIRCLE", circleIds: string[]) => void;
  posting: boolean;
  onPost: () => void;
}) {
  const { data: circles, isLoading } = useSWR<ShareCircle[]>(
    open ? "/api/circles/share-picker" : null,
  );
  const [membersOpenFor, setMembersOpenFor] = useState<ShareCircle | null>(null);
  const [newCircleOpen, setNewCircleOpen] = useState(false);

  if (!open) return null;

  const hasAudience =
    audienceType === "FRIENDS" || (audienceType === "CIRCLE" && circleIds.length > 0);

  const toggleCircle = (id: string) => {
    const next = new Set(circleIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange("CIRCLE", Array.from(next));
  };

  const selectAllFriends = () => onChange("FRIENDS", []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Nav row */}
      <div
        className="flex items-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3"
      >
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <span className="flex-1 text-center text-sm font-semibold">Share</span>
        <span className="w-[52px]" />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {/* Question block */}
        <div className="mb-6 space-y-1.5">
          <h1 className="font-serif text-[22px] font-semibold leading-snug">Who sees this?</h1>
          <p className="font-serif text-sm italic text-muted-foreground">
            Pick a circle, or a few. Nobody outside them will see it.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !circles || circles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-5 text-center">
            <p className="text-sm text-muted-foreground">
              No circles yet. Ask a friend to add you to one, or start your own.
            </p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => setNewCircleOpen(true)}
            >
              Create your own circle
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {circles.map((circle) => (
              <CircleCard
                key={circle.id}
                circle={circle}
                selected={audienceType === "CIRCLE" && circleIds.includes(circle.id)}
                onToggle={() => toggleCircle(circle.id)}
                onOpenMembers={() => setMembersOpenFor(circle)}
              />
            ))}
          </div>
        )}

        {/* Or divider */}
        <div className="my-5 flex items-center justify-center">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            Or
          </span>
        </div>

        {/* All Friends row */}
        <div
          role="checkbox"
          aria-checked={audienceType === "FRIENDS"}
          tabIndex={0}
          onClick={selectAllFriends}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              selectAllFriends();
            }
          }}
          className={cn(
            "cursor-pointer rounded-xl border px-4 py-3 transition-colors duration-150",
            audienceType === "FRIENDS"
              ? "border-foreground bg-muted"
              : "border-border bg-background",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[15px] font-semibold">All Friends</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                On its own, not with circles
              </div>
            </div>
            <span
              className={cn(
                "mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border",
                audienceType === "FRIENDS"
                  ? "border-foreground bg-foreground text-background"
                  : "border-input text-transparent",
              )}
            >
              {audienceType === "FRIENDS" && (
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-muted px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <Button
          onClick={onPost}
          disabled={!hasAudience || posting}
          className="h-10 w-full rounded-xl"
        >
          {posting ? "Posting…" : "Post"}
        </Button>
      </div>

      {/* Member popup */}
      <Sheet open={!!membersOpenFor} onOpenChange={(v) => !v && setMembersOpenFor(null)}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-serif">
              {membersOpenFor?.name}, {membersOpenFor?.memberCount}{" "}
              {membersOpenFor?.memberCount === 1 ? "person" : "people"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-2 divide-y divide-border">
            {membersOpenFor?.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={m.image ?? undefined} alt={m.username} />
                  <AvatarFallback>{initialsFor(m.username)}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{m.username}</span>
              </div>
            ))}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setMembersOpenFor(null)}>
              Done
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <NewCircleDialog
        open={newCircleOpen}
        onClose={() => setNewCircleOpen(false)}
        onCreate={async (name, description) => {
          const circle = await createCircle({ name, description });
          await mutate("/api/circles/share-picker");
          await mutate("/api/circles");
          onChange("CIRCLE", [circle.id]);
        }}
      />
    </div>
  );
}
