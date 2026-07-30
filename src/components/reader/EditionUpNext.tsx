// src/components/reader/EditionUpNext.tsx
"use client";

import Link from "next/link";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { PostPreviewRow } from "@/components/PostPreviewRow";

type EditionPost = {
  id: string;
  title?: string | null;
  updatedAt: string;
  author?: { id: string; username?: string | null } | null;
  heroThumbUrl?: string | null;
  readByMe?: boolean;
};

type EditionResponse = {
  id: string;
  posts: EditionPost[];
};

export function EditionUpNext({
  editionId,
  currentPostId,
  backHref,
}: {
  editionId: string;
  currentPostId: string;
  backHref: string;
}) {
  const { data, isLoading } = useSWR<EditionResponse>(
    `/api/editions/${editionId}`,
  );

  if (isLoading || !data) return null;

  const siblings = data.posts.filter((p) => p.id !== currentPostId);
  const unread = siblings.filter((p) => !p.readByMe);
  const read = siblings.filter((p) => p.readByMe);

  if (unread.length === 0) {
    return (
      <section className="space-y-3 rounded-xl border bg-background/60 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          You're all caught up this week.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href={backHref}>Back to edition</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Keep reading</h2>
        <div className="rounded-xl border bg-background/60 p-3 sm:p-4 divide-y">
          {unread.map((p) => (
            <PostPreviewRow
              key={p.id}
              variant="new"
              postId={p.id}
              title={p.title ?? "Untitled"}
              authorName={p.author?.username ?? "Unknown author"}
              metaText={`${formatDistanceToNow(new Date(p.updatedAt))} ago`}
              thumbUrl={p.heroThumbUrl}
              href={`/reader/${p.id}/edition`}
            />
          ))}
        </div>
      </div>

      {read.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Already read this week ({read.length})
          </summary>
          <div className="mt-2 rounded-xl border bg-background/40 p-3 sm:p-4 divide-y opacity-70">
            {read.map((p) => (
              <PostPreviewRow
                key={p.id}
                variant="earlier"
                postId={p.id}
                title={p.title ?? "Untitled"}
                authorName={p.author?.username ?? "Unknown author"}
                metaText={`${formatDistanceToNow(new Date(p.updatedAt))} ago`}
                thumbUrl={p.heroThumbUrl}
                href={`/reader/${p.id}/edition`}
              />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
