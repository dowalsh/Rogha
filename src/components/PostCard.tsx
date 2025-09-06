// src/components/PostCard.tsx
"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { UserButton } from "@clerk/nextjs";

type PostCardProps = {
  id: string;
  title?: string | null;
  authorName?: string | null;
  href?: string; // optional, defaults to /editor/:id
  className?: string;
};

export function PostCard({
  id,
  title,
  authorName,
  href = `/reader/${id}`,
  className,
}: PostCardProps) {
  return (
    <Card className={className}>
      <Link href={href}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* <UserButton /> */}

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
