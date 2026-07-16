// src/components/Frontpage.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { EditionRevealOverlay } from "@/components/EditionRevealOverlay";
import { ContentOverflowMenu } from "@/components/ContentOverflowMenu";

// Front page posts as they arrive from the Edition page
type Post = {
  id: string;
  title?: string | null;
  author?: { id: string; name?: string | null; image?: string | null } | null;
  audienceType: "ALL_USERS" | "FRIENDS" | "CIRCLE";
  circleId?: string | null;
  circle?: { id: string; name: string } | null;
  heroImageUrl?: string | null;
};

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
  return post.author?.name ?? "Unknown";
}

function LeadStory({ post, currentUserId, onReported, onBlocked }: { post: Post; currentUserId?: string | null; onReported: () => void; onBlocked: () => void }) {
  const authorName = getAuthorName(post);
  const hasImage = Boolean(post.heroImageUrl);
  const isOwn = !!currentUserId && post.author?.id === currentUserId;

  // No image → full-width headline layout
  if (!hasImage) {
    return (
      <section className="border-b pb-8 relative">
        <Link href={`/reader/${post.id}?from=edition`} className="group block w-full">
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
      <Link href={`/reader/${post.id}?from=edition`} className="group block w-full">
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

function SecondaryStory({ post, currentUserId, onReported, onBlocked }: { post: Post; currentUserId?: string | null; onReported: () => void; onBlocked: () => void }) {
  const authorName = getAuthorName(post);
  const isOwn = !!currentUserId && post.author?.id === currentUserId;

  return (
    <div className="relative h-full">
      <Link href={`/reader/${post.id}?from=edition`} className="group block h-full">
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
        href={`/reader/${post.id}?from=edition`}
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

export function Frontpage({ edition, revealProps, currentUserId }: FrontpageProps) {
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

  if (posts.length === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 font-serif">
        <header className="border-b pb-4 text-center">
          <h1 className="text-5xl font-black uppercase tracking-wide whitespace-nowrap">
            {editionLabel}
          </h1>
        </header>

        <div className="py-20 text-center text-3xl font-bold uppercase tracking-widest text-muted-foreground">
          NO STORIES THIS WEEK
        </div>
      </div>
    );
  }

  // const [lead, ...rest] = posts;
  // const secondary = rest.slice(0, 3);
  // const others = rest.slice(3);
  const [lead, ...rest] = posts;
  const secondary = rest;

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
        <h1 className="text-5xl font-black uppercase tracking-wide">
          {editionLabel}
        </h1>
      </header>

      {/* Lead story */}
      {lead && <LeadStory post={lead} currentUserId={currentUserId} onReported={() => handleReported(lead.id)} onBlocked={() => handleBlocked(lead.author?.id ?? "")} />}

      {/* Secondary grid: 2–3 stories underneath the lead */}
      {secondary.length > 0 && (
        <section className="border-b pb-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {secondary.map((post) => (
              <SecondaryStory key={post.id} post={post} currentUserId={currentUserId} onReported={() => handleReported(post.id)} onBlocked={() => handleBlocked(post.author?.id ?? "")} />
            ))}
          </div>
        </section>
      )}

      {/* Remaining stories as a vertical list, like bottom-of-front-page teasers */}
      {/* {others.length > 0 && (
        <section className="pb-10">
          <ul className="border bg-card px-3">
            {others.map((post) => (
              <TertiaryStory key={post.id} post={post} />
            ))}
          </ul>
        </section>
      )} */}
    </div>
    </>
  );
}
