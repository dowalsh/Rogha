"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { UserLink } from "@/components/admin/UserLink";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";

type PostStatus = "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED" | "REMOVED";
type CommentStatus = "ACTIVE" | "REMOVED";
type ReportStatus = "PENDING" | "ACTIONED" | "DISMISSED";
type ContentType = "POST" | "COMMENT";

type AdminReport = {
  id: string;
  contentType: ContentType;
  contentId: string;
  status: ReportStatus;
  createdAt: string;
  reporter: { id: string; username: string; email: string };
  preview: string;
  contentStatus: PostStatus | CommentStatus | null;
  contentAuthor: { id: string; username: string } | null;
  postId: string | null; // populated for COMMENT reports
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString();
}

export function ReportsList() {
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

  const showSkeleton = useDelayedLoading(loading);
  if (showSkeleton) return <AdminTableSkeleton columns={9} />;
  if (loading) return null;

  if (reports.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">No reports.</p>;
  }

  const viewPostHref = (r: AdminReport) =>
    r.contentType === "POST"
      ? `/admin/posts/${r.contentId}`
      : r.postId
        ? `/admin/posts/${r.postId}#comment-${r.contentId}`
        : null;

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="space-y-3 sm:hidden">
        {reports.map((r) => {
          const isPending = r.status === "PENDING";
          const isActing = acting.has(r.id);
          const href = viewPostHref(r);
          return (
            <div key={r.id} className={`rounded-lg border p-3 space-y-2 ${!isPending ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{r.contentType}</span>
                <StatusBadge status={r.status} />
              </div>
              <p className="text-xs line-clamp-3">
                {r.preview || <span className="italic text-muted-foreground">No preview</span>}
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <div>
                  <span className="text-muted-foreground">Content author: </span>
                  {r.contentAuthor ? (
                    <UserLink id={r.contentAuthor.id} username={r.contentAuthor.username} />
                  ) : (
                    <span className="text-muted-foreground italic">deleted</span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Content status: </span>
                  {r.contentStatus ? <StatusBadge status={r.contentStatus} /> : <span className="text-muted-foreground">—</span>}
                </div>
              </div>
              <UserLink id={r.reporter.id} username={r.reporter.username} email={r.reporter.email} />
              <div className="text-xs text-muted-foreground">{fmt(r.createdAt)}</div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {href && (
                  <Link
                    href={href}
                    className="rounded px-2 py-1 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors whitespace-nowrap"
                  >
                    View post
                  </Link>
                )}
                {isPending && (
                  <>
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
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block overflow-x-auto">
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
                      <UserLink id={r.contentAuthor.id} username={r.contentAuthor.username} />
                    ) : (
                      <span className="text-xs text-muted-foreground italic">deleted</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <UserLink id={r.reporter.id} username={r.reporter.username} email={r.reporter.email} />
                  </td>
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
      </div>
    </>
  );
}
