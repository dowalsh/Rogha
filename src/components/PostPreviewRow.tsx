// src/components/PostPreviewRow.tsx
"use client";

import Link from "next/link";
import { Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type PostPreviewRowVariant = "coming" | "new" | "earlier" | "plain";

export type PostPreviewRowProps = {
  variant: PostPreviewRowVariant;
  postId: string;
  title: string;
  // Omit to hide the author (e.g. a profile's own post list, where it's implied).
  authorName?: string | null;
  // The "when" text, e.g. "3 days ago" or "submitted 2 hours ago".
  metaText: string;
  thumbUrl?: string | null;
  newCount?: number;
  href?: string;
  className?: string;
};

const pillClass =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-[0.16em]";

function Thumb({ thumbUrl, blurred }: { thumbUrl?: string | null; blurred: boolean }) {
  if (!thumbUrl) return null;
  return (
    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbUrl}
        alt=""
        className={cn("h-full w-full object-cover", blurred && "blur-sm scale-110")}
      />
    </div>
  );
}

export function PostPreviewRow({
  variant,
  title,
  authorName,
  metaText,
  thumbUrl,
  newCount,
  href,
  className,
}: PostPreviewRowProps) {
  const showLeadingSlot = variant !== "plain";
  const showTrailingSlot = variant !== "plain";

  const content = (
    <div className={cn("flex items-center gap-3 py-2", className)}>
      {/* Leading slot: unread dot / spacer / nothing — fixed width so feed rows align */}
      {showLeadingSlot && (
        <div className="flex h-12 w-3 shrink-0 items-center justify-center">
          {variant === "new" && (
            <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden />
          )}
        </div>
      )}

      <Thumb thumbUrl={thumbUrl} blurred={variant === "coming"} />

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate font-serif text-sm",
            variant === "earlier" && "text-muted-foreground",
          )}
        >
          {title}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {authorName ? `${authorName} · ${metaText}` : metaText}
        </div>
      </div>

      {showTrailingSlot && (
        <div className="flex shrink-0 items-center">
          {variant === "coming" && (
            <Lock className="h-4 w-4 text-muted-foreground" aria-label="Locked until reveal" />
          )}
          {variant === "new" && typeof newCount === "number" && newCount > 0 && (
            <span className={pillClass}>{newCount} new</span>
          )}
          {variant === "earlier" && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:bg-accent/50 rounded-md px-1 -mx-1 transition">
        {content}
      </Link>
    );
  }

  return content;
}
