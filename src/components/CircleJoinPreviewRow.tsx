// src/components/CircleJoinPreviewRow.tsx
"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type CircleJoinPreviewRowVariant = "new" | "earlier";

export type CircleJoinPreviewRowProps = {
  variant: CircleJoinPreviewRowVariant;
  username: string;
  avatarUrl: string | null;
  circleName: string;
  metaText: string;
  href: string;
};

// Same row shape/rhythm as PostPreviewRow (leading unread dot, fixed-width
// slots, trailing chevron) so a circle-join row sits naturally alongside
// post rows in the same Buzz list — just an avatar instead of a thumbnail,
// and no "N new" count since each join is its own row, not grouped.
export function CircleJoinPreviewRow({
  variant,
  username,
  avatarUrl,
  circleName,
  metaText,
  href,
}: CircleJoinPreviewRowProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="block hover:bg-accent/50 rounded-md px-1 -mx-1 transition"
    >
      <div className="flex items-center gap-3 py-2">
        <div className="flex h-12 w-3 shrink-0 items-center justify-center">
          {variant === "new" && (
            <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden />
          )}
        </div>

        <Avatar className="h-12 w-12 shrink-0">
          <AvatarImage src={avatarUrl ?? undefined} alt={username} />
          <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "truncate font-serif text-sm",
              variant === "earlier" && "text-muted-foreground",
            )}
          >
            {username} joined {circleName}
          </div>
          <div className="truncate text-xs text-muted-foreground">{metaText}</div>
        </div>

        <div className="flex shrink-0 items-center">
          {variant === "earlier" && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
    </Link>
  );
}
