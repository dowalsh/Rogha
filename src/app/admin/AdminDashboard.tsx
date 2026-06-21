"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Spinner } from "@/components/Spinner";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type PostStatus = "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED" | "REMOVED";
type CommentStatus = "ACTIVE" | "REMOVED";
type ReportStatus = "PENDING" | "ACTIONED" | "DISMISSED";
type ContentType = "POST" | "COMMENT";

type AdminPost = {
  id: string;
  title: string | null;
  status: PostStatus;
  createdAt: string;
  author: { id: string; username: string; name: string | null; email: string };
};

type AdminComment = {
  id: string;
  content: string;
  status: CommentStatus;
  createdAt: string;
  author: { id: string; username: string; name: string | null; email: string };
  post: { id: string; title: string | null };
};

type AdminReport = {
  id: string;
  contentType: ContentType;
  contentId: string;
  status: ReportStatus;
  createdAt: string;
  reporter: { id: string; username: string; name: string | null; email: string };
  preview: string;
  contentStatus: PostStatus | CommentStatus | null;
  contentAuthor: { username: string; name: string | null } | null;
  postId: string | null; // populated for COMMENT reports
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleString();
}

function StatusBadge({ status }: { status: string }) {
  const color: Record<string, string> = {
    REMOVED: "bg-red-100 text-red-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    ACTIONED: "bg-green-100 text-green-700",
    DISMISSED: "bg-gray-100 text-gray-500",
    PUBLISHED: "bg-blue-100 text-blue-700",
    ACTIVE: "bg-green-50 text-green-600",
  };
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${color[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

function AuthorCell({ author }: { author: { username: string; name: string | null; email: string } }) {
  return (
    <span className="text-xs">
      <span className="font-medium">{author.name ?? author.username}</span>
      <span className="text-muted-foreground"> · {author.email}</span>
    </span>
  );
}

function RemoveButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded px-2 py-1 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40 transition-colors"
    >
      Remove
    </button>
  );
}

// ─── Posts tab ────────────────────────────────────────────────────────────────

function PostsTab() {
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

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="overflow-x-auto">
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
              <td className="py-3 pr-4"><AuthorCell author={post.author} /></td>
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
      {posts.length === 0 && <p className="py-12 text-center text-muted-foreground">No posts.</p>}
    </div>
  );
}

// ─── Comments tab ─────────────────────────────────────────────────────────────

function CommentsTab() {
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

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="overflow-x-auto">
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
              <td className="py-3 pr-4"><AuthorCell author={c.author} /></td>
              <td className="py-3 pr-4 text-xs text-muted-foreground max-w-[160px] truncate">
                {c.post.title ?? <span className="italic">Untitled post</span>}
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
      {comments.length === 0 && <p className="py-12 text-center text-muted-foreground">No comments.</p>}
    </div>
  );
}

// ─── Reports tab ──────────────────────────────────────────────────────────────

function ReportsTab() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/reports")
      .then((r) => r.json())
      .then(setReports)
      .catch(() => toast.error("Failed to load reports"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: "remove_content" | "dismiss") {
    setActing((prev) => new Set(Array.from(prev).concat(id)));
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();

      if (action === "remove_content") {
        setReports((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, status: "ACTIONED", contentStatus: "REMOVED" }
              : r,
          ),
        );
        toast.success("Content removed and report actioned");
      } else {
        setReports((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "DISMISSED" } : r)),
        );
        toast.success("Report dismissed");
      }
    } catch {
      toast.error("Action failed");
    } finally {
      setActing((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Type</th>
            <th className="pb-2 pr-4 font-medium">Preview</th>
            <th className="pb-2 pr-4 font-medium">Content author</th>
            <th className="pb-2 pr-4 font-medium">Reporter</th>
            <th className="pb-2 pr-4 font-medium">Report status</th>
            <th className="pb-2 pr-4 font-medium">Content status</th>
            <th className="pb-2 pr-4 font-medium">Reported at</th>
            <th className="pb-2 pr-4 font-medium">View</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {reports.map((r) => {
            const isPending = r.status === "PENDING";
            const isActing = acting.has(r.id);
            return (
              <tr key={r.id} className={!isPending ? "opacity-60" : ""}>
                <td className="py-3 pr-4">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{r.contentType}</span>
                </td>
                <td className="py-3 pr-4 max-w-[220px]">
                  <span className="line-clamp-2 text-xs">{r.preview || <span className="italic text-muted-foreground">No preview</span>}</span>
                </td>
                <td className="py-3 pr-4">
                  {r.contentAuthor ? (
                    <span className="text-xs font-medium">{r.contentAuthor.name ?? r.contentAuthor.username}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">deleted</span>
                  )}
                </td>
                <td className="py-3 pr-4"><AuthorCell author={r.reporter} /></td>
                <td className="py-3 pr-4"><StatusBadge status={r.status} /></td>
                <td className="py-3 pr-4">
                  {r.contentStatus ? <StatusBadge status={r.contentStatus} /> : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">{fmt(r.createdAt)}</td>
                <td className="py-3 pr-4">
                  {r.contentType === "POST" ? (
                    <Link
                      href={`/admin/posts/${r.contentId}`}
                      className="rounded px-2 py-1 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors whitespace-nowrap"
                    >
                      View post
                    </Link>
                  ) : r.postId ? (
                    <Link
                      href={`/admin/posts/${r.postId}#comment-${r.contentId}`}
                      className="rounded px-2 py-1 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors whitespace-nowrap"
                    >
                      View post
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-3">
                  {isPending && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => act(r.id, "remove_content")}
                        disabled={isActing}
                        className="rounded px-2 py-1 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40 transition-colors whitespace-nowrap"
                      >
                        Remove content
                      </button>
                      <button
                        onClick={() => act(r.id, "dismiss")}
                        disabled={isActing}
                        className="rounded px-2 py-1 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-40 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {reports.length === 0 && <p className="py-12 text-center text-muted-foreground">No reports.</p>}
    </div>
  );
}

// ─── Dashboard shell ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="mt-6">
          <PostsTab />
        </TabsContent>
        <TabsContent value="comments" className="mt-6">
          <CommentsTab />
        </TabsContent>
        <TabsContent value="reports" className="mt-6">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
