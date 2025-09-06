// src/app/read/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import StarterKit from "@tiptap/starter-kit";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";

type PostDTO = {
  id: string;
  title?: string | null;
  content?: unknown; // TipTap JSON
  status?: "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED";
  editionId?: string | null;
  author?: {
    id: string;
    name?: string | null;
    image?: string | null;
  } | null;
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

export default function ReadPostPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<PostDTO | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/posts/${params.id}`, {
          cache: "no-store",
        });
        if (res.status === 404) return notFound();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: PostDTO = await res.json();
        if (!cancelled) setPost(data);
      } catch (e) {
        console.error("Failed to load post:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const backHref = post?.editionId
    ? `/editions/${post.editionId}`
    : "/editions";
  const title = post?.title ?? "Untitled Post";
  const authorName = post?.author?.name ?? "Unknown author";
  const rawContent = post?.content;

  // Validate before rendering; only log + show diagnostics (no auto-fix here)
  const validation = useMemo(() => validateDocJSON(rawContent), [rawContent]);

  const contentNode = useMemo(() => {
    if (!validation.ok) {
      console.groupCollapsed("[TipTap render] invalid content");
      console.warn(validation);
      console.log("Raw content:", rawContent);
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
      console.log("Raw content:", rawContent);
      console.groupEnd();
      return (
        <p className="text-sm text-muted-foreground">
          Unable to render content.
        </p>
      );
    }
  }, [rawContent, validation]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6 space-y-4 text-sm text-muted-foreground">
        Loading…
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

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      {/* Back to edition */}
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push(backHref)}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to edition
        </Button>
      </div>

      {/* Header: title + author */}
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{authorName}</span>
        </div>
      </header>

      {/* Rendered content or diagnostics */}
      <div className="prose prose-neutral max-w-none">{contentNode}</div>
    </div>
  );
}
