// src/components/buzz/BuzzItem.tsx
"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, Send, Rocket } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type BuzzKind = "like" | "comment" | "submit" | "publish";

export type BuzzItemProps = {
  id: string;

  kind: BuzzKind;
  actorName: string;
  actorAvatarUrl?: string | null;

  // e.g. "liked", "commented", "submitted a post", "had a post published"
  verbLabel: string;

  // post context
  postTitle: string;
  postAuthorName: string;

  // if present → this event is about a comment
  commentText?: string | null;

  createdAt: string; // ISO
  href?: string; // link to post / comment
  className?: string;
};

const iconByKind: Record<BuzzKind, LucideIcon> = {
  like: Heart,
  comment: MessageCircle,
  submit: Send,
  publish: Rocket,
};

const iconBgByKind: Record<BuzzKind, string> = {
  like: "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300",
  comment: "bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300",
  submit:
    "bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300",
  publish:
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300",
};

export function BuzzItem({
  kind,
  actorName,
  actorAvatarUrl,
  verbLabel,
  postTitle,
  postAuthorName,
  commentText,
  createdAt,
  href,
  className,
}: BuzzItemProps) {
  const Icon = iconByKind[kind];

  const timeText = formatDistanceToNow(new Date(createdAt), {
    addSuffix: true,
  });

  const content = (
    <div
      className={cn(
        "rounded-lg border bg-background/60 p-3 sm:p-4 transition hover:bg-accent/50",
        className,
      )}
    >
      <div className="flex flex-col gap-2">
        {" "}
        {/* 1. POST AT THE TOP */}
        {/* <p className="mb-2 text-xs text-muted-foreground">
        <span className="italic font-serif">“{postTitle}”</span>{" "}
        <span className="text-[11px]">— {postAuthorName}</span>
      </p> */}
        {/* 2. ACTOR ROW: avatar, icon, name + verb, time */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          {/* LEFT SIDE */}
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={actorAvatarUrl ?? undefined} />
              <AvatarFallback>
                {actorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[0.7rem]",
                iconBgByKind[kind],
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>

            <p className="text-sm leading-tight">
              <span className="font-medium">{actorName}</span>{" "}
              <span className="text-muted-foreground">{verbLabel}</span>
            </p>
          </div>

          {/* RIGHT SIDE */}

          <div className="inline-flex items-baseline gap-2 bg-zinc-100/50 dark:bg-zinc-900/40 px-3 py-1.5 rounded-sm border border-zinc-200/60 dark:border-zinc-800/60">
            <span className="font-serif text-sm tracking-tight text-muted-foreground/90">
              “{postTitle}”
            </span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground/70">
              {postAuthorName}
            </span>
          </div>
        </div>
        {/* 3. COMMENT BUBBLE (if relevant) */}
        {commentText && (
          <div className="mt-3 flex gap-2">
            {/* Optionally repeat avatar here; if you don't want double avatars, remove this block */}
            <div className="h-6 w-6 shrink-0" />

            <p className="flex-1 rounded-3xl rounded-tl-none bg-sky-50 dark:bg-sky-900/40 px-3 py-2 text-sm leading-snug border border-sky-100 dark:border-sky-800 whitespace-pre-wrap">
              {commentText}
            </p>
          </div>
        )}
        <div className="flex justify-start">
          <p className="text-xs text-muted-foreground/50">{timeText}</p>
        </div>{" "}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
