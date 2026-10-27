"use client";

import Link from "next/link";
import { ChevronRight, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type LikesPreviewRowVariant = "new" | "earlier";

export type LikesPreviewRowProps = {
  variant: LikesPreviewRowVariant;
  likers: { username: string; avatarUrl: string | null }[];
  otherCount: number;
  title: string;
  metaText: string;
  href: string;
};

// "Luke", "Luke and Peter", "Luke, Peter +2".
export function formatLikerNames(names: string[], otherCount: number): string {
  if (otherCount > 0) return `${names.join(", ")} +${otherCount}`;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return names.join(", ");
}

// Same row shape as CircleJoinPreviewRow (leading unread dot, fixed-width
// slots, trailing chevron), with the most recent liker's avatar plus a small
// heart badge so it reads as a like at a glance.
export function LikesPreviewRow({
  variant,
  likers,
  otherCount,
  title,
  metaText,
  href,
}: LikesPreviewRowProps) {
  const lead = likers[0];
  const names = formatLikerNames(
    likers.map((l) => l.username),
    otherCount,
  );

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

        <div className="relative h-12 w-12 shrink-0">
          <Avatar className="h-12 w-12">
            <AvatarImage src={lead?.avatarUrl ?? undefined} alt={lead?.username ?? ""} />
            <AvatarFallback>{(lead?.username ?? "").slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background">
            <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" aria-hidden />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "truncate font-serif text-sm",
              variant === "earlier" && "text-muted-foreground",
            )}
          >
            {names} liked your post
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {title} · {metaText}
          </div>
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
