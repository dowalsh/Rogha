// src/app/reader/[id]/[[...from]]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { notFound, useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser, SignInButton } from "@clerk/nextjs";
import { EditionRevealOverlay } from "@/components/EditionRevealOverlay";
import { FetchError } from "@/lib/swr";

import StarterKit from "@tiptap/starter-kit";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import CommentsSection from "@/components/CommentsSection";
import { Spinner } from "@/components/Spinner";
import { LikeButton } from "@/components/LikeButton";
import { ShareLinkControls } from "@/components/ShareLinkControls";
import { ContentOverflowMenu } from "@/components/ContentOverflowMenu";
import { useLike } from "@/hooks/useLike";
import type { AudienceType } from "@/types/index";

type PostDTO = {
  id: string;
  title?: string | null;
  content?: unknown;
  status?: "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED" | "REMOVED";
  editionId?: string | null;
  heroImageUrl?: string | null;
  author?: {
    id: string;
    clerkId?: string | null;
    name?: string | null;
    image?: string | null;
  } | null;
  likeCount: number;
  likedByMe: boolean;
  audienceType: AudienceType;
  edition?: { publishedAt: string | null } | null;
};

// --- helpers: quick validator & explainer (diagnostics only) ---
function isPlainObject(x: unknown): x is Record<string, any> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

type Validation = { ok: true } | { ok: false; reason: string; path?: string };

function validateDocJSON(raw: unknown): Validation {
  if (raw == null) return { ok: false, reason: "content is null/undefined" };
  if (typeof raw === "string")
    return { ok: false, reason: "content is a string (JSON text?)" };
  if (!isPlainObject(raw))
    return { ok: false, reason: `content is ${typeof raw}, not an object` };

  if ((raw as any).type !== "doc")
    return {
      ok: false,
      reason: `root.type is "${(raw as any).type}", expected "doc"`,
    };
  if (!Array.isArray((raw as any).content))
    return { ok: false, reason: "root.content is not an array" };

  // shallow walk to find first invalid node shape
  const stack: Array<{ node: any; path: string }> = (
    (raw as any).content || []
  ).map((n: any, i: number) => ({ node: n, path: `content[${i}]` }));
  while (stack.length) {
    const { node, path } = stack.pop()!;
    if (!isPlainObject(node))
      return { ok: false, reason: "node is not an object", path };
    if (typeof node.type !== "string")
      return { ok: false, reason: "node.type missing or not a string", path };
    if (node.content != null) {
      if (!Array.isArray(node.content))
        return { ok: false, reason: "node.content is not an array", path };
      for (let i = 0; i < node.content.length; i++) {
        stack.push({ node: node.content[i], path: `${path}.content[${i}]` });
      }
    }
  }
  return { ok: true };
}

export default function ReadPostPage({
  params,
}: {
  params: { id: string; from?: string[] };
}) {
  const router = useRouter();
  // `from` rides the path (/reader/[id]/edition, /reader/[id]/buzz) rather
  // than a query param — Next's client router cache strips search params
  // when keying prefetched page segments, so a query-string version of this
  // signal can silently serve a stale value across different entry points
  // to the same post within the staleTimes.dynamic window (see
  // docs/specs/data-fetching-caching.md).
  const from = params.from?.[0] ?? null;

  const [editionStatus, setEditionStatus] = useState<{
    hasOpened: boolean;
    viewerCount: number;
    viewerNames: string[];
  } | null>(null);
  const [editionStatusChecked, setEditionStatusChecked] = useState(false);
  const [editionRevealed, setEditionRevealed] = useState(true);
  const [revealFading, setRevealFading] = useState(false);

  const { isLoaded, isSignedIn, user } = useUser();

  // Shared cache with the editor page's own `/api/posts/${id}` fetch — the
  // route returns a superset shape covering both. Revalidates on remount
  // once stale, so revisiting a post you already read is instant and just
  // quietly refreshes (e.g. like counts) in the background.
  const {
    data: post,
    error: postError,
    isLoading,
  } = useSWR<PostDTO>(`/api/posts/${params.id}`, { shouldRetryOnError: false });

  if (postError instanceof FetchError && postError.status === 404) {
    notFound();
  }

  useEffect(() => {
    let cancelled = false;
    if (!post?.editionId) {
      setEditionStatusChecked(true);
      return;
    }
    setEditionStatusChecked(false);
    (async () => {
      try {
        const sr = await fetch(`/api/editions/${post.editionId}/status`, { cache: "no-store" });
        if (!cancelled && sr.ok) {
          const status = await sr.json();
          setEditionStatus(status);
          setEditionRevealed(status.hasOpened);
        }
      } catch {
        // Status fetch failed — default to revealed so content is never blocked by a network error
      } finally {
        if (!cancelled) setEditionStatusChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, [post?.editionId]);

  // Mark this post read once per mount — powers the home page's "N of M"
  // progress and the New buzz / Earlier split.
  const readFiredRef = useRef(false);
  useEffect(() => {
    if (!post?.id || readFiredRef.current) return;
    readFiredRef.current = true;
    fetch(`/api/posts/${post.id}/read`, { method: "POST" })
      .then(() => mutate("/api/home"))
      .catch(() => {});
  }, [post?.id]);

  const loading = isLoading || !editionStatusChecked;

  const handleReveal = () => {
    setRevealFading(true);
    setTimeout(() => setEditionRevealed(true), 200);
  };

  const { liked, count, toggle } = useLike({
    id: post?.id ?? "", // fallback string, won’t be used until post loads
    type: "post",
    initialLiked: post?.likedByMe ?? false,
    initialCount: post?.likeCount ?? 0,
  });

  const [postReported, setPostReported] = useState(false);

  const isAuthor = !!(user && post && user.id === post.author?.clerkId);
  const isShareable = post?.status === "PUBLISHED";

  const fallbackBackHref = post?.editionId
    ? `/editions/${post.editionId}`
    : "/editions";
  const backHref = from === "buzz" ? "/" : fallbackBackHref;
  const backLabel = from === "buzz" ? "Back to Buzz" : "Back to edition";
  const title = post?.title ?? "Untitled Post";
  const authorName = post?.author?.name ?? "Unknown author";
  const rawContent = post?.content;
  const heroImageUrl = post?.heroImageUrl;

  // Validate before rendering; only log + show diagnostics (no auto-fix here)
  const validation = useMemo(() => validateDocJSON(rawContent), [rawContent]);

  const contentNode = useMemo(() => {
    if (!validation.ok) {
      console.groupCollapsed("[TipTap render] invalid content");
      console.warn(validation);
      // console.log("Raw content:", rawContent);
      console.groupEnd();
      return (
        <div className="text-sm text-muted-foreground">
          Unable to render content ({validation.reason}
          {validation.path ? ` at ${validation.path}` : ""}).
          <br />
          <pre className="mt-2 rounded border bg-muted/30 p-3 text-xs overflow-x-auto">
            {JSON.stringify(rawContent, null, 2)}
          </pre>
        </div>
      );
    }

    try {
      return renderToReactElement({
        extensions: [StarterKit], // add Link/Image/etc. if you use them
        content: rawContent as any,
      });
    } catch (e) {
      console.groupCollapsed("[TipTap render] threw");
      console.error(e);
      // console.log("Raw content:", rawContent);
      console.groupEnd();
      return (
        <p className="text-sm text-muted-foreground">
          Unable to render content.
        </p>
      );
    }
  }, [rawContent, validation]);

  // Wait for Clerk to finish loading
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Spinner className="h-8 w-8" />
        <p className="text-sm text-muted-foreground">Checking authentication…</p>
      </div>
    );
  }

  // Require sign-in for reading posts (or just for comments)
  if (!isSignedIn) {
    return (
      <div className="mx-auto max-w-3xl p-6 space-y-4 text-center">
        <p className="text-muted-foreground">
          Please sign in to view this post.
        </p>
        <SignInButton mode="modal">
          <Button>Sign in</Button>
        </SignInButton>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    );
  }
  if (!post) {
    return (
      <div className="mx-auto max-w-3xl p-6 space-y-4 text-sm text-muted-foreground">
        Post not found.
      </div>
    );
  }

  if (postReported) {
    return (
      <div className="mx-auto max-w-3xl p-6 space-y-4 text-center">
        <p className="text-muted-foreground">
          Thanks — we've received your report and will review this post.
        </p>
        <Button variant="ghost" size="sm" onClick={() => router.push(backHref)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {backLabel}
        </Button>
      </div>
    );
  }
  // // focus debug output on audience type only
  // console.log("post.audienceType:", post?.audienceType ?? "undefined");

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      {/* Back — sticky, always accessible */}
      <div className="sticky top-[calc(env(safe-area-inset-top)+4rem)] z-40 -mx-6 -mt-6 border-b bg-background px-6 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push(backHref)}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          {backLabel}
        </Button>
      </div>

      {/* Edition reveal overlay — covers post content until opened */}
      {!editionRevealed && editionStatus && post?.editionId && (
        <EditionRevealOverlay
          editionId={post.editionId}
          viewerCount={editionStatus.viewerCount}
          viewerNames={editionStatus.viewerNames}
          fading={revealFading}
          onReveal={handleReveal}
          mode="fullscreen"
        />
      )}

      {/* HERO IMAGE */}
      {heroImageUrl && (
        <div className="space-y-2">
          <div className="relative w-full h-96 overflow-hidden rounded-lg">
            <Image
              src={heroImageUrl}
              alt="Hero"
              fill
              sizes="768px"
              className="object-contain"
              priority
            />
          </div>
        </div>
      )}

      {/* Header: title + likes + author */}
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
          {!isAuthor && (
            <ContentOverflowMenu
              contentType="POST"
              contentId={post.id}
              authorId={post.author?.id ?? ""}
              authorName={authorName}
              onReported={() => setPostReported(true)}
              onBlocked={() => router.replace("/")}
            />
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{authorName}</span>
          {post.edition?.publishedAt && (
            <>
              <span>·</span>
              <span>
                {new Date(post.edition.publishedAt).toLocaleDateString("en-IE", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </>
          )}
        </div>
        {isAuthor && isShareable && <ShareLinkControls postId={post.id} />}
      </header>

      {/* Rendered content or diagnostics */}
      <div className="prose prose-neutral max-w-none break-words">{contentNode}</div>
      {/* Post Like Button */}
      <div className="flex justify-center">
        <LikeButton
          liked={liked}
          count={count}
          onToggle={toggle}
          fetchLikersUrl={`/api/posts/${post!.id}/likes`}
        />
      </div>
      <hr className="my-8 border-t border-muted" />
      <CommentsSection
        postId={post.id}
        postAuthorId={post.author?.id ?? ""}
        postAuthorName={post.author?.name ?? "post author"}
        postAudienceType={post.audienceType}
      />
    </div>
  );
}
