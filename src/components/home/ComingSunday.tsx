// src/components/home/ComingSunday.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostPreviewRow } from "@/components/PostPreviewRow";
import { WeeklyJamInfoDot } from "@/components/jam/WeeklyJamInfoDot";
import { shortTimeAgo, cn } from "@/lib/utils";
import type { ComingNextData } from "@/lib/home";

type ComingSundayProps = {
  data: ComingNextData;
  collapsed: boolean;
};

function jamTeaserText(count: number, viewerJamConnected: boolean): string {
  if (count === 0) {
    // Nobody's connected yet — if the viewer isn't either, make it a pitch,
    // not a status report: they could be the first.
    return viewerJamConnected
      ? "No friends have connected to The Weekly Jam yet"
      : "No one's connected to The Weekly Jam yet — be the first!";
  }
  return `${count} friend${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} connected to The Weekly Jam`;
}

// Mirrors PostPreviewRow's exact row shape (leading spacer, h-12 thumb,
// title/subtitle stack, trailing slot) so it reads as a post — same
// vertical rhythm as the real rows above it, title "The Weekly Jam" with
// the teaser line as its subtitle, info dot standing in for the trailing
// lock/chevron icon.
function JamTeaser({
  data,
  className,
}: {
  data: Extract<ComingNextData, { state: "empty" | "posts" }>;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 py-2", className)}>
      <div className="flex h-12 w-3 shrink-0 items-center justify-center" />
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted">
        <Music className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-serif text-sm">The Weekly Jam</div>
        <div className="truncate text-xs text-muted-foreground">
          {jamTeaserText(data.jamConnectedCount, data.viewerJamConnected)}
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        <WeeklyJamInfoDot />
      </div>
    </div>
  );
}

export function ComingSunday({ data, collapsed }: ComingSundayProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(!collapsed);
  const [creating, setCreating] = useState(false);

  const handleStartPost = async () => {
    try {
      setCreating(true);
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) throw new Error(`Create failed: ${res.status}`);
      const { id } = (await res.json()) as { id: string };
      router.push(`/editor/${id}`);
    } catch (e) {
      console.error(e);
      setCreating(false);
    }
  };

  if (data.state === "no-friends") {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">Coming Sunday.</p>
        <div className="flex items-center justify-between gap-2 pt-1 text-sm">
          <span className="text-muted-foreground">
            Add some friends to start seeing what they're writing.
          </span>
          <Button asChild size="sm">
            <Link href="/circles">Find friends</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (data.state === "empty") {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">Coming Sunday.</p>
        <JamTeaser data={data} />
        <div className="flex items-center justify-between gap-2 pt-1 text-sm">
          <span className="text-muted-foreground">
            Nothing yet · {data.daysLeft} day{data.daysLeft === 1 ? "" : "s"} left
          </span>
          <Button size="sm" onClick={handleStartPost} disabled={creating}>
            Start a post
          </Button>
        </div>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex w-full items-center justify-between py-2 text-sm"
      >
        <span className="font-medium">Coming Sunday</span>
        <span className="flex items-center gap-1 text-muted-foreground">
          {data.posts.length} posts
          <ChevronRight className="h-4 w-4" />
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => (collapsed ? setExpanded(false) : undefined)}
        className="flex w-full items-center justify-between py-1 text-left"
      >
        <span className="text-sm font-medium">Coming Sunday.</span>
        {collapsed && <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      <div className="divide-y">
        {data.posts.map((p) => {
          const metaText =
            p.isOwn && p.isRepublish
              ? `You republished "${p.title}" to ${p.recipientCount ?? 0} friend${
                  p.recipientCount === 1 ? "" : "s"
                }`
              : p.isRepublish
                ? `Republished · submitted ${shortTimeAgo(new Date(p.submittedAt))}`
                : `submitted ${shortTimeAgo(new Date(p.submittedAt))}`;
          return (
            <PostPreviewRow
              key={p.id}
              variant={p.isOwn ? "own" : "coming"}
              postId={p.id}
              title={p.title}
              authorName={p.isOwn ? "You" : p.authorName}
              metaText={metaText}
              thumbUrl={p.isOwn ? p.heroThumbUrl : p.heroThumbBlurUrl}
              href={p.isOwn ? `/editor/${p.id}` : undefined}
            />
          );
        })}
        {/* Positioned like one more row at the end of the list (not
            functionally part of `data.posts`) so it reads as a card in the
            list rather than trailing status text after the CTA below. */}
        <JamTeaser data={data} />
      </div>

      <div className="flex items-center justify-between pt-2 text-sm">
        {data.hasSubmitted ? (
          <span className="text-muted-foreground">
            Yours is in · you and {data.friendsSubmittedCount} friend
            {data.friendsSubmittedCount === 1 ? "" : "s"} so far
          </span>
        ) : (
          <>
            <span className="text-muted-foreground">
              Add yours · {data.daysLeft} day{data.daysLeft === 1 ? "" : "s"} left
            </span>
            <Button size="sm" onClick={handleStartPost} disabled={creating}>
              Start a post
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
