// src/components/reader/EditionUpNext.tsx
"use client";

import Link from "next/link";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { PostPreviewRow } from "@/components/PostPreviewRow";
import { Skeleton } from "@/components/ui/skeleton";

type EditionPost = {
  id: string;
  title?: string | null;
  updatedAt: string;
  author?: { id: string; username?: string | null } | null;
  heroThumbUrl?: string | null;
  readByMe?: boolean;
};

type WeeklyJamRow = {
  userId: string;
  imageUrl: string | null;
  isViewer: boolean;
};

type WeeklyJamData = {
  rows: WeeklyJamRow[];
  readByMe?: boolean;
};

type EditionResponse = {
  id: string;
  posts: EditionPost[];
  weeklyJam?: WeeklyJamData | null;
};

// A single row in the "Keep reading" / "Already read" lists — either a real
// post or the Jam's synthetic entry (the Jam has no Post row of its own).
type UpNextItem = {
  id: string;
  title: string;
  authorName?: string | null;
  metaText: string;
  thumbUrl?: string | null;
  href: string;
  readByMe: boolean;
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

  // Reserve the same footprint a loaded card would take instead of
  // rendering nothing — an empty-then-pop-in section shifts the page while
  // someone's mid-scroll and can land their tap on whatever used to be
  // there (e.g. the comment/article text above) instead of the link that
  // appears a moment later.
  if (isLoading || !data) {
    return (
      <section className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-3 rounded-xl border bg-background/60 p-3 sm:p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </section>
    );
  }

  const siblings = data.posts.filter((p) => p.id !== currentPostId);
  const postItems: UpNextItem[] = siblings.map((p) => ({
    id: p.id,
    title: p.title ?? "Untitled",
    authorName: p.author?.username ?? "Unknown author",
    metaText: `${formatDistanceToNow(new Date(p.updatedAt))} ago`,
    thumbUrl: p.heroThumbUrl,
    href: `/reader/${p.id}/edition`,
    readByMe: Boolean(p.readByMe),
  }));

  const jam = data.weeklyJam;
  const jamItem: UpNextItem | null =
    jam && jam.rows.length > 0
      ? {
          id: `jam:${editionId}`,
          title: "The Weekly Jam",
          authorName: null,
          metaText: "friends' top tracks this week",
          thumbUrl: jam.rows.find((r) => r.isViewer)?.imageUrl ?? jam.rows[0]?.imageUrl,
          href: `/editions/${editionId}/jam`,
          readByMe: Boolean(jam.readByMe),
        }
      : null;

  const items = jamItem ? [...postItems, jamItem] : postItems;
  const unread = items.filter((i) => !i.readByMe);
  const read = items.filter((i) => i.readByMe);

  return (
    <section className="space-y-4">
      {unread.length === 0 ? (
        <div className="space-y-3 rounded-xl border bg-background/60 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            You're all caught up this week.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={backHref}>Back to edition</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Keep reading</h2>
          <div className="rounded-xl border bg-background/60 p-3 sm:p-4 divide-y">
            {unread.map((item) => (
              <PostPreviewRow
                key={item.id}
                variant="new"
                postId={item.id}
                title={item.title}
                authorName={item.authorName}
                metaText={item.metaText}
                thumbUrl={item.thumbUrl}
                href={item.href}
              />
            ))}
          </div>
        </div>
      )}

      {read.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Already read this week ({read.length})
          </summary>
          <div className="mt-2 rounded-xl border bg-background/40 p-3 sm:p-4 divide-y opacity-70">
            {read.map((item) => (
              <PostPreviewRow
                key={item.id}
                variant="earlier"
                postId={item.id}
                title={item.title}
                authorName={item.authorName}
                metaText={item.metaText}
                thumbUrl={item.thumbUrl}
                href={item.href}
              />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
