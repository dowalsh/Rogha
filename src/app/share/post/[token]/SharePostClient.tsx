"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LockedCommentsCTA } from "@/components/LockedCommentsCTA";
import StarterKit from "@tiptap/starter-kit";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import type { PublicPostData } from "@/lib/access/publicShareAccess";

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isValidDoc(raw: unknown): boolean {
  if (!isPlainObject(raw)) return false;
  if ((raw as any).type !== "doc") return false;
  if (!Array.isArray((raw as any).content)) return false;
  return true;
}

export default function SharePostClient({ post }: { post: PublicPostData }) {
  const contentNode = useMemo(() => {
    if (!isValidDoc(post.content)) {
      return (
        <p className="text-sm text-muted-foreground">Unable to render content.</p>
      );
    }
    try {
      return renderToReactElement({
        extensions: [StarterKit],
        content: post.content as any,
      });
    } catch {
      return (
        <p className="text-sm text-muted-foreground">Unable to render content.</p>
      );
    }
  }, [post.content]);

  const authorName = post.author?.name ?? "Unknown author";
  const authorImage = post.author?.image ?? null;
  const initials = authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const formattedDate = new Date(post.updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-8">
      {post.heroImageUrl && (
        <div className="relative w-full h-96 overflow-hidden rounded-lg flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.heroImageUrl}
            alt="Hero"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}

      <header className="space-y-4">
        <h1 className="text-3xl font-semibold leading-tight">
          {post.title ?? "Untitled Post"}
        </h1>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={authorImage ?? undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{authorName}</span>
            <span className="mx-2">·</span>
            <span>{formattedDate}</span>
          </div>
        </div>
      </header>

      <div className="prose prose-neutral max-w-none">{contentNode}</div>

      <hr className="border-t border-muted" />

      <LockedCommentsCTA postId={post.id} />
    </div>
  );
}
