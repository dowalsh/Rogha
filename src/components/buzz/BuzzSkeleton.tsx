// src/components/buzz/BuzzSkeleton.tsx
"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function BuzzSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-lg p-2 border bg-background/40"
        >
          <Skeleton className="h-8 w-8 rounded-full" />

          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
