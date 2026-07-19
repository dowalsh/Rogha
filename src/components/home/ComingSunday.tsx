// src/components/home/ComingSunday.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedPostRow } from "@/components/home/FeedPostRow";
import type { ComingNextData } from "@/lib/home";

type ComingSundayProps = {
  data: Extract<ComingNextData, { visible: true }>;
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
          <FeedPostRow
            key={p.id}
            variant="coming"
            postId={p.id}
            title={p.title}
            authorName={p.isOwn ? "You" : p.authorName}
            metaText={`submitted ${formatDistanceToNow(new Date(p.submittedAt))} ago`}
            thumbUrl={p.heroThumbBlurUrl}
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
    </div>
  );
}
