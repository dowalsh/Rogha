"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CircleMembersSheet } from "@/components/CircleMembersSheet";
import { NewCircleDialog } from "@/components/NewCircleDialog";
import { CirclePill } from "@/components/circles/CirclePill";
import { createCircle } from "@/actions/circle.action";
import { cn } from "@/lib/utils";

type Member = { id: string; username: string; image: string | null };
type ShareCircle = { id: string; name: string; memberCount: number; members: Member[] };
type FriendsItem = { user: { id: string; username: string | null; image: string | null } };

const FACE_LIMIT = 5;

function initialsFor(username: string) {
  return username.slice(0, 2).toUpperCase();
}

function FaceRow({
  members,
  memberCount,
  onOpenMembers,
}: {
  members: Member[];
  memberCount: number;
  onOpenMembers: () => void;
}) {
  const shown = members.slice(0, FACE_LIMIT);
  const overflow = memberCount - shown.length;

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

// Shared card shape for a circle or "All Friends" — same face-row + member-
// popup pattern for both, per feedback that All Friends shouldn't look like
// a lesser option.
function AudienceCard({
  title,
  subtitle,
  memberCount,
  members,
  selected,
  onToggle,
  onOpenMembers,
}: {
  title: React.ReactNode;
  subtitle: string;
  memberCount: number;
  members: Member[];
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
          <div className="text-[15px] font-semibold">{title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
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
      {memberCount > 0 && (
        <div className="mt-[11px]">
          <FaceRow members={members} memberCount={memberCount} onOpenMembers={onOpenMembers} />
        </div>
      )}
    </div>
  );
}

// Inline audience picker, embedded directly in the composer (not a separate
// screen) — circles are multi-select cards, "All Friends" is a standalone
// mutually-exclusive card with the same face-row/member-popup treatment.
export function ShareAudienceSelector({
  audienceType,
  circleIds,
  onChange,
  disabled,
}: {
  audienceType: "FRIENDS" | "CIRCLE";
  circleIds: string[];
  onChange: (audienceType: "FRIENDS" | "CIRCLE", circleIds: string[]) => void;
  disabled?: boolean;
}) {
  const { data: circles, isLoading } = useSWR<ShareCircle[]>("/api/circles/share-picker");
  const { data: friendsData } = useSWR<{ items: FriendsItem[] }>(
    "/api/friends?box=accepted&limit=100",
  );
  const friends: Member[] =
    friendsData?.items.map((i) => ({
      id: i.user.id,
      username: i.user.username ?? "friend",
      image: i.user.image,
    })) ?? [];

  const [membersPopup, setMembersPopup] = useState<{ title: string; members: Member[] } | null>(
    null,
  );
  const [newCircleOpen, setNewCircleOpen] = useState(false);

  const toggleCircle = (id: string) => {
    if (disabled) return;
    const next = new Set(circleIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange("CIRCLE", Array.from(next));
  };

  const selectAllFriends = () => {
    if (disabled) return;
    onChange("FRIENDS", []);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Audience</label>
      <p className="text-xs text-muted-foreground">
        Pick a circle, or a few. Nobody outside them will see it.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !circles || circles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-5 text-center">
          <p className="text-sm text-muted-foreground">
            No circles yet. Ask a friend to add you to one, or start your own.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            disabled={disabled}
            onClick={() => setNewCircleOpen(true)}
          >
            Create your own circle
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {circles.map((circle) => (
            <AudienceCard
              key={circle.id}
              title={<CirclePill name={circle.name} />}
              subtitle={`${circle.memberCount} ${circle.memberCount === 1 ? "person" : "people"}`}
              memberCount={circle.memberCount}
              members={circle.members}
              selected={audienceType === "CIRCLE" && circleIds.includes(circle.id)}
              onToggle={() => toggleCircle(circle.id)}
              onOpenMembers={() => setMembersPopup({ title: circle.name, members: circle.members })}
            />
          ))}
        </div>
      )}

      {/* Or divider */}
      <div className="flex items-center justify-center py-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          Or
        </span>
      </div>

      <AudienceCard
        title="All Friends"
        subtitle="On its own, not with circles"
        memberCount={friends.length}
        members={friends}
        selected={audienceType === "FRIENDS"}
        onToggle={selectAllFriends}
        onOpenMembers={() => setMembersPopup({ title: "All Friends", members: friends })}
      />

      {/* Member popup — same for a circle or All Friends */}
      <CircleMembersSheet target={membersPopup} onClose={() => setMembersPopup(null)} />

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
