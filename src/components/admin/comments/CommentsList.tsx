"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { UserLink } from "@/components/admin/UserLink";
import { PostLink } from "@/components/admin/PostLink";
import { RemoveButton } from "@/components/admin/RemoveButton";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";

type CommentStatus = "ACTIVE" | "REMOVED";

type AdminComment = {
  id: string;
  content: string;
  status: CommentStatus;
  createdAt: string;
  author: { id: string; username: string; email: string };
  post: { id: string; title: string | null };
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString();
}

export function CommentsList() {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/admin/comments")
      .then((r) => r.json())
      .then(setComments)
      .catch(() => toast.error("Failed to load comments"))
      .finally(() => setLoading(false));
  }, []);

  async function removeComment(id: string) {
    setRemoving((prev) => new Set(Array.from(prev).concat(id)));
    try {
      const res = await fetch(`/api/admin/comments/${id}/remove`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, status: "REMOVED" } : c)));
      toast.success("Comment removed");
    } catch {
      toast.error("Failed to remove comment");
    } finally {
      setRemoving((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  const showSkeleton = useDelayedLoading(loading);
  if (showSkeleton) return <AdminTableSkeleton columns={6} />;
  if (loading) return null;

  if (comments.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">No comments.</p>;
  }

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="space-y-3 sm:hidden">
        {comments.map((c) => (
          <div
            key={c.id}
            className={`rounded-lg border p-3 space-y-2 ${c.status === "REMOVED" ? "opacity-50" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm line-clamp-3">{c.content}</span>
              <StatusBadge status={c.status} />
            </div>
            <UserLink id={c.author.id} username={c.author.username} email={c.author.email} />
            <div className="text-xs text-muted-foreground truncate">
              on <PostLink id={c.post.id} title={c.post.title} />
            </div>
            <div className="text-xs text-muted-foreground">{fmt(c.createdAt)}</div>
            {c.status !== "REMOVED" && (
              <div className="pt-1">
                <RemoveButton onClick={() => removeComment(c.id)} disabled={removing.has(c.id)} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Comment</th>
              <th className="pb-2 pr-4 font-medium">Author</th>
              <th className="pb-2 pr-4 font-medium">Post</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">Created</th>
              <th className="pb-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {comments.map((c) => (
              <tr key={c.id} className={c.status === "REMOVED" ? "opacity-50" : ""}>
                <td className="py-3 pr-4 max-w-[260px]">
                  <span className="line-clamp-2">{c.content}</span>
                </td>
                <td className="py-3 pr-4">
                  <UserLink id={c.author.id} username={c.author.username} email={c.author.email} />
                </td>
                <td className="py-3 pr-4 text-xs text-muted-foreground max-w-[160px] truncate">
                  <PostLink id={c.post.id} title={c.post.title} />
                </td>
                <td className="py-3 pr-4"><StatusBadge status={c.status} /></td>
                <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">{fmt(c.createdAt)}</td>
                <td className="py-3">
                  {c.status !== "REMOVED" && (
                    <RemoveButton onClick={() => removeComment(c.id)} disabled={removing.has(c.id)} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
