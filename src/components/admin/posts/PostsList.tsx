"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { UserLink } from "@/components/admin/UserLink";
import { RemoveButton } from "@/components/admin/RemoveButton";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";

type PostStatus = "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED" | "REMOVED";

type AdminPost = {
  id: string;
  title: string | null;
  status: PostStatus;
  createdAt: string;
  author: { id: string; username: string; email: string };
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString();
}

export function PostsList() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/admin/posts")
      .then((r) => r.json())
      .then(setPosts)
      .catch(() => toast.error("Failed to load posts"))
      .finally(() => setLoading(false));
  }, []);

  async function removePost(id: string) {
    setRemoving((prev) => new Set(Array.from(prev).concat(id)));
    try {
      const res = await fetch(`/api/admin/posts/${id}/remove`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "REMOVED" } : p)));
      toast.success("Post removed");
    } catch {
      toast.error("Failed to remove post");
    } finally {
      setRemoving((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  const showSkeleton = useDelayedLoading(loading);
  if (showSkeleton) return <AdminTableSkeleton columns={5} />;
  if (loading) return null;

  if (posts.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">No posts.</p>;
  }

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="space-y-3 sm:hidden">
        {posts.map((post) => (
          <div
            key={post.id}
            className={`rounded-lg border p-3 space-y-2 ${post.status === "REMOVED" ? "opacity-50" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-sm break-words">
                {post.title ?? <span className="text-muted-foreground italic">Untitled</span>}
              </span>
              <StatusBadge status={post.status} />
            </div>
            <UserLink id={post.author.id} username={post.author.username} email={post.author.email} />
            <div className="text-xs text-muted-foreground">{fmt(post.createdAt)}</div>
            <div className="flex items-center gap-2 pt-1">
              <Link
                href={`/admin/posts/${post.id}`}
                className="rounded px-2 py-1 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                View
              </Link>
              {post.status !== "REMOVED" && (
                <RemoveButton onClick={() => removePost(post.id)} disabled={removing.has(post.id)} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Title</th>
              <th className="pb-2 pr-4 font-medium">Author</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">Created</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {posts.map((post) => (
              <tr key={post.id} className={post.status === "REMOVED" ? "opacity-50" : ""}>
                <td className="py-3 pr-4 font-medium max-w-[280px] truncate">
                  {post.title ?? <span className="text-muted-foreground italic">Untitled</span>}
                </td>
                <td className="py-3 pr-4">
                  <UserLink id={post.author.id} username={post.author.username} email={post.author.email} />
                </td>
                <td className="py-3 pr-4"><StatusBadge status={post.status} /></td>
                <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">{fmt(post.createdAt)}</td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/posts/${post.id}`}
                      className="rounded px-2 py-1 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                    >
                      View
                    </Link>
                    {post.status !== "REMOVED" && (
                      <RemoveButton onClick={() => removePost(post.id)} disabled={removing.has(post.id)} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
