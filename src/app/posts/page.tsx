// src/app/posts/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { PostRow } from "@/components/PostRow";
import { Button } from "@/components/ui/button";

// ✅ rename to avoid shadowing the component & match API shape
type PostRowData = {
  id: string;
  title?: string | null;
  status: "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED";
  updatedAt: string; // from JSON
  edition?: { id: string; title: string | null } | null; // ✅ now has id + title
};

export default function PostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<PostRowData[] | null>(null); // ✅ use PostRowData
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/posts", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: PostRowData[] = await res.json(); // ✅ typed to match API
        if (!cancelled) setPosts(data);
      } catch (e) {
        console.error("Failed to load posts:", e);
        if (!cancelled) setPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async () => {
    try {
      setCreating(true);
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) throw new Error(`Create failed: ${res.status}`);
      const { id } = (await res.json()) as { id: string };
      router.push(`/editor/${id}`);
    } catch (e) {
      console.error(e);
      setCreating(false);
    }
  };

  return (
    <>
      <SignedOut>
        <RedirectToSignIn redirectUrl="/posts" />
      </SignedOut>

      <SignedIn>
        <div className="mx-auto max-w-4xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">My Posts</h1>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating..." : "New Post"}
            </Button>
          </div>

          {loading ? (
            <div className="rounded-md border p-6 text-sm text-muted-foreground">
              Loading…
            </div>
          ) : posts && posts.length === 0 ? (
            <div className="rounded-md border p-6 text-sm text-muted-foreground">
              No posts yet. Create your first one!
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3 font-medium">Post</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Edition</th>
                    <th className="p-3 font-medium">Updated</th>
                    <th className="p-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {(posts ?? []).map((p) => (
                    <PostRow
                      key={p.id}
                      id={p.id}
                      title={p.title ?? "Untitled Post"}
                      status={p.status}
                      updatedAt={new Date(p.updatedAt)}
                      edition={
                        p.edition
                          ? {
                              id: p.edition.id,
                              title: p.edition.title ?? "Untitled Edition",
                            }
                          : undefined
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SignedIn>
    </>
  );
}
