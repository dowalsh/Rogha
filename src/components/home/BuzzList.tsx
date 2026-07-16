// src/components/home/BuzzList.tsx
"use client";

import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { FeedPostRow } from "@/components/home/FeedPostRow";
import type { BuzzPostsData } from "@/lib/home";

type BuzzListProps = {
  buzz: BuzzPostsData;
  onShowMore?: () => void;
  isLoadingMore?: boolean;
};

export function BuzzList({ buzz, onShowMore, isLoadingMore }: BuzzListProps) {
  const { newBuzz, earlier, earlierHasMore } = buzz;

  if (newBuzz.length === 0 && earlier.length === 0) {
    return (
      <section className="rounded-xl border bg-background/60 p-3 sm:p-4">
        <p className="text-sm text-muted-foreground">
          No buzz yet. Friends' activities show up here as they do stuff in
          Rogha.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {newBuzz.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">New buzz</h2>
          <div className="rounded-xl border bg-background/60 p-3 sm:p-4 divide-y">
            {newBuzz.map((row) => (
              <FeedPostRow
                key={row.postId}
                variant="new"
                postId={row.postId}
                title={row.title}
                authorName={row.authorName}
                metaText={`${formatDistanceToNow(new Date(row.latestActivityAt))} ago`}
                thumbUrl={row.heroThumbUrl}
                newCount={row.newCount}
                href={`/reader/${row.postId}/buzz`}
              />
            ))}
          </div>
        </section>
      )}

      {earlier.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Earlier</h2>
          <div className="rounded-xl border bg-background/60 p-3 sm:p-4 divide-y">
            {earlier.map((row) => (
              <FeedPostRow
                key={row.postId}
                variant="earlier"
                postId={row.postId}
                title={row.title}
                authorName={row.authorName}
                metaText={`${formatDistanceToNow(new Date(row.latestActivityAt))} ago`}
                thumbUrl={row.heroThumbUrl}
                href={`/reader/${row.postId}/buzz`}
              />
            ))}
          </div>
          {earlierHasMore && onShowMore && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={onShowMore} disabled={isLoadingMore}>
                Show more
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
