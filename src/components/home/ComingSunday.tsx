// src/components/home/ComingSunday.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostPreviewRow } from "@/components/PostPreviewRow";
import { shortTimeAgo } from "@/lib/utils";
import type { ComingNextData } from "@/lib/home";

type ComingSundayProps = {
  data: ComingNextData;
  collapsed: boolean;
};

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
        <div className="flex items-center justify-between gap-2 pt-1 text-sm">
          <span className="text-muted-foreground">
            Nothing yet · {data.daysLeft} day{data.daysLeft === 1 ? "" : "s"} left
          </span>
          <Button size="sm" onClick={handleStartPost} disabled={creating}>
            Start a post
          </Button>
        </div>
        {data.jamConnectedCount > 0 && (
          <p className="pt-1 text-xs text-muted-foreground">
            {data.jamConnectedCount} friend{data.jamConnectedCount === 1 ? "" : "s"}{" "}
            {data.jamConnectedCount === 1 ? "has" : "have"} connected their Weekly Jam
          </p>
        )}
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
        {data.posts.map((p) => (
          <PostPreviewRow
            key={p.id}
            variant={p.isOwn ? "own" : "coming"}
            postId={p.id}
            title={p.title}
            authorName={p.isOwn ? "You" : p.authorName}
            metaText={`submitted ${shortTimeAgo(new Date(p.submittedAt))}`}
            thumbUrl={p.isOwn ? p.heroThumbUrl : p.heroThumbBlurUrl}
            href={p.isOwn ? `/editor/${p.id}` : undefined}
          />
        ))}
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
      {data.jamConnectedCount > 0 && (
        <p className="pt-1 text-xs text-muted-foreground">
          {data.jamConnectedCount} friend{data.jamConnectedCount === 1 ? "" : "s"}{" "}
          {data.jamConnectedCount === 1 ? "has" : "have"} connected their Weekly Jam
        </p>
      )}
    </div>
  );
}
