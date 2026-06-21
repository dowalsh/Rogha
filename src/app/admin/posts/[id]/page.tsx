"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Spinner } from "@/components/Spinner";
import { ChevronLeft } from "lucide-react";
import StarterKit from "@tiptap/starter-kit";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";

type AdminComment = {
  id: string;
  content: string;
  status: string;
  createdAt: string;
  parentCommentId: string | null;
  author: { username: string; name: string | null };
};

type AdminPostDetail = {
  id: string;
  title: string | null;
  content: unknown;
  status: string;
  heroImageUrl: string | null;
  createdAt: string;
  audienceType: string;
  author: { id: string; username: string; name: string | null; image: string | null; email: string };
  comments: AdminComment[];
};

export default function AdminPostViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<AdminPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/posts/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setPost)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const contentNode = useMemo(() => {
    if (!post?.content) return null;
    try {
      return renderToReactElement({
        extensions: [StarterKit],
        content: post.content as any,
      });
    } catch {
      return <p className="text-sm text-muted-foreground">Unable to render content.</p>;
    }
  }, [post?.content]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <p className="text-muted-foreground">Post not found or access denied.</p>
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    REMOVED: "bg-red-100 text-red-700",
    PUBLISHED: "bg-blue-100 text-blue-700",
    SUBMITTED: "bg-yellow-100 text-yellow-700",
    DRAFT: "bg-gray-100 text-gray-500",
    ARCHIVED: "bg-gray-100 text-gray-400",
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to admin
      </button>

      {/* Admin meta bar */}
      <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-xs space-y-1">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`rounded px-1.5 py-0.5 font-medium ${statusColor[post.status] ?? "bg-muted"}`}>
            {post.status}
          </span>
          <span className="text-muted-foreground">
            by <span className="font-medium text-foreground">{post.author.name ?? post.author.username}</span>
            {" "}·{" "}
            <span>{post.author.email}</span>
          </span>
          <span className="text-muted-foreground">
            {new Date(post.createdAt).toLocaleString()}
          </span>
          <span className="text-muted-foreground uppercase tracking-wide">{post.audienceType}</span>
        </div>
      </div>

      {/* Hero image */}
      {post.heroImageUrl && (
        <div className="aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted">
          <img src={post.heroImageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      {/* Title */}
      <h1 className="text-3xl font-bold leading-tight">
        {post.title ?? <span className="text-muted-foreground italic">Untitled</span>}
      </h1>

      {/* Body */}
      <div className="prose prose-neutral max-w-none">
        {contentNode ?? <p className="text-muted-foreground italic">No content.</p>}
      </div>

      {/* Comments */}
      {post.comments.length > 0 && (
        <div className="border-t pt-6 space-y-4">
          <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
            Comments ({post.comments.length})
          </h2>
          {post.comments.map((c) => (
            <div
              key={c.id}
              id={`comment-${c.id}`}
              className={`scroll-mt-20 rounded-lg border p-3 space-y-1 ${c.parentCommentId ? "ml-8 bg-muted/30" : ""} ${c.status === "REMOVED" ? "border-red-200 bg-red-50/50 opacity-70" : ""}`}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {c.author.name ?? c.author.username}
                </span>
                {c.parentCommentId && <span>↳ reply</span>}
                <span>·</span>
                <span>{new Date(c.createdAt).toLocaleString()}</span>
                {c.status === "REMOVED" && (
                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-700 font-medium">REMOVED</span>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{c.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
