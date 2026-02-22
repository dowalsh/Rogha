// src/components/buzz/BuzzFeed.tsx
"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";
import { BuzzItem, BuzzItemProps } from "./BuzzItem";
import { BuzzSkeleton } from "./BuzzSkeleton";

export type BuzzFeedProps = {
  items: BuzzItemProps[];
  isLoading?: boolean;
  className?: string;
  headerSlot?: ReactNode; // optional: for "Buzz" heading / actions
};

export function BuzzFeed({
  items,
  isLoading = false,
  className,
  headerSlot,
}: BuzzFeedProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <h2 className="text-lg font-semibold">Buzz</h2>
        </div>
        {headerSlot}
      </div>

      {/* Body */}
      <div className="rounded-xl border bg-background/60 p-3 sm:p-4 space-y-3">
        {isLoading ? (
          <BuzzSkeleton />
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No buzz yet. Friends' activities show up here as they do stuff in
            Rogha.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <BuzzItem {...item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
