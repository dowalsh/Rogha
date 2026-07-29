// src/components/PostCard.tsx
"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

type PostCardProps = {
  id: string;
  title?: string | null;
  authorName?: string | null;
  thumbUrl?: string | null;
  href?: string; // optional, defaults to /editor/:id
  className?: string;
};

export function PostCard({
  id,
  title,
  authorName,
  thumbUrl,
  href = `/reader/${id}`,
  className,
}: PostCardProps) {
  return (
    <Card className={className}>
      <Link href={href}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {thumbUrl ? (
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-md bg-muted" />
            )}

            <div className="min-w-0">
              <div className="truncate font-medium">
                {title ?? "Untitled Post"}
              </div>
              <div className="truncate text-sm text-muted-foreground">
                {authorName ?? "Unknown author"}
              </div>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
