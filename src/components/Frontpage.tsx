// src/components/Frontpage.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { EditionRevealOverlay } from "@/components/EditionRevealOverlay";
import { ContentOverflowMenu } from "@/components/ContentOverflowMenu";
import { WeeklyJamExplainer } from "@/components/jam/WeeklyJamExplainer";
import { NewBadge } from "@/components/ui/new-badge";
import { jamPreviewFromRows, type WeeklyJamRow } from "@/lib/jam-preview";

// Front page posts as they arrive from the Edition page
type Post = {
  id: string;
  title?: string | null;
  author?: { id: string; username?: string | null; image?: string | null } | null;
  audienceType: "ALL_USERS" | "FRIENDS" | "CIRCLE";
  circleId?: string | null;
  circle?: { id: string; name: string } | null;
  heroImageUrl?: string | null;
};

type WeeklyJam = {
  rows: WeeklyJamRow[];
  viewerConnected: boolean;
};

// The Jam is treated as one more item competing for the lead/secondary
// slots (always appended last, never interleaved) rather than a separate
// section — see docs/specs/2026-08-04-weekly-jam-mvp.md.
type FrontpageItem =
  | { kind: "post"; post: Post }
  | { kind: "jam"; jam: WeeklyJam; editionId: string };

type FrontpageProps = {
  edition: {
    id: string;
    title?: string | null;
    weekStart: string;
    posts: Post[];
  };
  revealProps?: {
    hasOpened: boolean;
    viewerCount: number;
    viewerNames: string[];
  };
  currentUserId?: string | null;
  weeklyJam?: WeeklyJam | null;
};


function formatEditionLabel(edition: FrontpageProps["edition"]): string {
  const date = edition.weekStart.slice(0, 10).replace(/-/g, "‑");
  return `Week of ${date}`;
}

function getAudienceLabel(post: Post): string {
  switch (post.audienceType) {
    case "ALL_USERS":
      return "All users";
    case "FRIENDS":
      return "Friends";
    case "CIRCLE":
      return post.circle?.name ? `Circle · ${post.circle.name}` : "Circle";
    default:
      return "";
  }
}

function getAuthorName(post: Post): string {
  return post.author?.username ?? "Unknown";
}

function jamHref(editionId: string): string {
  return `/editions/${editionId}/jam`;
}

function LeadStory({ item, currentUserId, onReported, onBlocked }: { item: FrontpageItem; currentUserId?: string | null; onReported: () => void; onBlocked: () => void }) {
  if (item.kind === "jam") {
    const { ownImageUrl } = jamPreviewFromRows(item.jam.rows);
    return (
      <section className="border-b pb-8 relative">
        <Link href={jamHref(item.editionId)} className="group block w-full">
          <article className="grid gap-6 transition-shadow duration-200 lg:grid-cols-[2fr,1fr] lg:items-stretch">
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
              {ownImageUrl && (
                <Image
                  src={ownImageUrl}
                  alt="Weekly Jam"
                  fill
                  sizes="(min-width: 1024px) 640px, 100vw"
                  className="object-cover"
                  priority
                />
              )}
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="text-3xl font-black leading-tight group-hover:underline">
                Weekly Jam
              </h2>
            </div>
          </article>
        </Link>
        {!item.jam.viewerConnected && (
          <div className="absolute top-0 right-0">
            <WeeklyJamExplainer trigger={<NewBadge />} />
          </div>
        )}
      </section>
    );
  }

  const { post } = item;
  const authorName = getAuthorName(post);
  const hasImage = Boolean(post.heroImageUrl);
  const isOwn = !!currentUserId && post.author?.id === currentUserId;

  // No image → full-width headline layout
  if (!hasImage) {
    return (
      <section className="border-b pb-8 relative">
        <Link href={`/reader/${post.id}/edition`} className="group block w-full">
          <article className="transition-shadow duration-200 space-y-4">
            <h2 className="text-4xl font-black leading-tight group-hover:underline">
              {post.title ?? "Untitled Post"}
            </h2>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{authorName}</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
              <span>{getAudienceLabel(post)}</span>
            </div>
          </article>
        </Link>
        {!isOwn && currentUserId && (
          <div className="absolute top-0 right-0">
            <ContentOverflowMenu contentType="POST" contentId={post.id} authorId={post.author?.id ?? ""} authorName={authorName} onReported={onReported} onBlocked={onBlocked} />
          </div>
        )}
      </section>
    );
  }

  // With image → two-column layout
  return (
    <section className="border-b pb-8 relative">
      <Link href={`/reader/${post.id}/edition`} className="group block w-full">
        <article className="grid gap-6 transition-shadow duration-200  lg:grid-cols-[2fr,1fr] lg:items-stretch">
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
            <Image
              src={post.heroImageUrl!}
              alt={post.title ?? "Story image"}
              fill
              sizes="(min-width: 1024px) 640px, 100vw"
              className="object-cover"
              priority
            />
          </div>

          <div className="flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <h2 className="text-3xl font-black leading-tight group-hover:underline">
                {post.title ?? "Untitled Post"}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{authorName}</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
              <span>{getAudienceLabel(post)}</span>
            </div>
          </div>
        </article>
      </Link>
      {!isOwn && currentUserId && (
        <div className="absolute top-0 right-0">
          <ContentOverflowMenu contentType="POST" contentId={post.id} authorId={post.author?.id ?? ""} authorName={authorName} onReported={onReported} onBlocked={onBlocked} />
        </div>
      )}
    </section>
  );
}

function SecondaryStory({ item, currentUserId, onReported, onBlocked }: { item: FrontpageItem; currentUserId?: string | null; onReported: () => void; onBlocked: () => void }) {
  if (item.kind === "jam") {
    const { ownImageUrl } = jamPreviewFromRows(item.jam.rows);
    return (
      <div className="relative h-full">
        <Link href={jamHref(item.editionId)} className="group block h-full">
          <article className="flex h-full flex-col justify-between border bg-card p-3 transition-shadow duration-200">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
              {ownImageUrl && (
                <Image
                  src={ownImageUrl}
                  alt="Weekly Jam"
                  fill
                  sizes="(min-width: 1024px) 320px, (min-width: 768px) 480px, 100vw"
                  className="object-cover"
                />
              )}
            </div>
            <div className="mt-2 space-y-2">
              <h3 className="text-lg font-semibold leading-snug group-hover:underline">
                Weekly Jam
              </h3>
            </div>
          </article>
        </Link>
        {!item.jam.viewerConnected && (
          <div className="absolute top-1 right-1 z-10">
            <WeeklyJamExplainer trigger={<NewBadge />} />
          </div>
        )}
      </div>
    );
  }

  const { post } = item;
  const authorName = getAuthorName(post);
  const isOwn = !!currentUserId && post.author?.id === currentUserId;

  return (
    <div className="relative h-full">
      <Link href={`/reader/${post.id}/edition`} className="group block h-full">
        <article className="flex h-full flex-col justify-between border bg-card p-3 transition-shadow duration-200 ">
          {post.heroImageUrl && (
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
              <Image
                src={post.heroImageUrl}
                alt={post.title ?? "Story image"}
                fill
                sizes="(min-width: 1024px) 320px, (min-width: 768px) 480px, 100vw"
                className="object-cover"
              />
            </div>
          )}

          <div className="mt-2 space-y-2">
            <h3 className="text-lg font-semibold leading-snug group-hover:underline">
              {post.title ?? "Untitled Post"}
            </h3>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{authorName}</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span>{getAudienceLabel(post)}</span>
          </div>
        </article>
      </Link>
      {!isOwn && currentUserId && (
        <div className="absolute top-1 right-1 z-10">
          <ContentOverflowMenu contentType="POST" contentId={post.id} authorId={post.author?.id ?? ""} authorName={authorName} onReported={onReported} onBlocked={onBlocked} />
        </div>
      )}
    </div>
  );
}

function TertiaryStory({ post }: { post: Post }) {
  const authorName = getAuthorName(post);

  return (
    <li>
      <Link
        href={`/reader/${post.id}/edition`}
        className="group flex items-start justify-between gap-3 py-3 text-sm"
      >
        <div className="space-y-1">
          <span className="font-medium leading-snug group-hover:underline">
            {post.title ?? "Untitled Post"}
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{authorName}</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
            <span>{getAudienceLabel(post)}</span>
          </div>
        </div>

        {/* {post.heroImageUrl && (
          <div className="ml-auto h-12 w-16 flex-shrink-0 overflow-hidden bg-muted">
            <img
              src={post.heroImageUrl}
              alt={post.title ?? "Story image"}
              className="h-full w-full object-cover"
            />
          </div>
        )} */}
      </Link>
    </li>
  );
}

export function Frontpage({ edition, revealProps, currentUserId, weeklyJam }: FrontpageProps) {
  const editionLabel = formatEditionLabel(edition);
  const allPosts = edition.posts ?? [];

  const [revealed, setRevealed] = useState(revealProps?.hasOpened ?? true);
  const [fading, setFading] = useState(false);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [blockedAuthorIds, setBlockedAuthorIds] = useState<Set<string>>(new Set());

  const posts = allPosts.filter(
    (p) => !reportedIds.has(p.id) && !blockedAuthorIds.has(p.author?.id ?? ""),
  );
  function handleReported(postId: string) {
    setReportedIds((prev) => new Set(Array.from(prev).concat(postId)));
  }
  function handleBlocked(authorId: string) {
    setBlockedAuthorIds((prev) => new Set(Array.from(prev).concat(authorId)));
  }

  const handleReveal = () => {
    setFading(true);
    setTimeout(() => setRevealed(true), 200);
  };

  // The Jam is always the last item, if present — see FrontpageItem above.
  const items: FrontpageItem[] = posts.map((post) => ({ kind: "post" as const, post }));
  if (weeklyJam) {
    items.push({ kind: "jam", jam: weeklyJam, editionId: edition.id });
  }
  const [lead, ...secondary] = items;

  function itemId(item: FrontpageItem): string {
    return item.kind === "jam" ? `jam-${item.editionId}` : item.post.id;
  }
  function itemAuthorId(item: FrontpageItem): string {
    return item.kind === "jam" ? "" : item.post.author?.id ?? "";
  }

  return (
    <>
      {!revealed && revealProps && (
        <EditionRevealOverlay
          editionId={edition.id}
          viewerCount={revealProps.viewerCount}
          viewerNames={revealProps.viewerNames}
          fading={fading}
          onReveal={handleReveal}
        />
      )}
    <div className="mx-auto max-w-5xl space-y-8 font-serif">
      {/* Masthead */}
      <header className="border-b pb-4 text-center">
        <h1 className="text-5xl font-black uppercase tracking-wide whitespace-nowrap">
          {editionLabel}
        </h1>
      </header>

      {items.length === 0 ? (
        <div className="py-20 text-center text-3xl font-bold uppercase tracking-widest text-muted-foreground">
          NO STORIES THIS WEEK
        </div>
      ) : (
        <>
          {/* Lead story */}
          {lead && (
            <LeadStory
              item={lead}
              currentUserId={currentUserId}
              onReported={() => handleReported(itemId(lead))}
              onBlocked={() => handleBlocked(itemAuthorId(lead))}
            />
          )}

          {/* Secondary grid: 2–3 stories underneath the lead */}
          {secondary.length > 0 && (
            <section className="border-b pb-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {secondary.map((item) => (
                  <SecondaryStory
                    key={itemId(item)}
                    item={item}
                    currentUserId={currentUserId}
                    onReported={() => handleReported(itemId(item))}
                    onBlocked={() => handleBlocked(itemAuthorId(item))}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
    </>
  );
}
