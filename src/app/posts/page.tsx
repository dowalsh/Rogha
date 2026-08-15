// src/app/posts/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { PostRow, PostCard } from "@/components/PostRow";
import { Button } from "@/components/ui/button";
import { PostsSkeleton } from "@/components/posts/PostsSkeleton";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { RepublishModal, type RepublishTarget } from "@/components/RepublishModal";
import { Gift } from "lucide-react";

// ✅ rename to avoid shadowing the component & match API shape
type PostRowData = {
  id: string;
  title?: string | null;
  status: "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED";
  updatedAt: string; // from JSON
  heroImageUrl?: string | null;
  edition?: { id: string; title: string | null } | null; // ✅ now has id + title
};

export default function PostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<PostRowData[] | null>(null); // ✅ use PostRowData
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [republishTarget, setRepublishTarget] = useState<RepublishTarget | null>(null);
  const [rationAvailable, setRationAvailable] = useState<boolean | null>(null);

  const refreshRationStatus = () => {
    fetch("/api/republish/status", { credentials: "include" })
      .then((r) => r.json())
      .then((s: { available: boolean }) => setRationAvailable(s.available))
      .catch(() => setRationAvailable(null));
  };

  useEffect(() => {
    refreshRationStatus();
  }, []);

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

  async function handleDeletePost(id: string) {
    try {
      setDeletingId(id);

      await fetch(`/api/posts/${id}`, {
        method: "DELETE",
      });

      setPosts((prev) => prev?.filter((p) => p.id !== id) ?? null);
    } finally {
      setDeletingId(null);
    }
  }

  const showSkeleton = useDelayedLoading(loading);

  if (showSkeleton) {
    return <PostsSkeleton />;
  }
  if (loading) {
    return null;
  }

  return (
    <>
      <SignedOut>
        <RedirectToSignIn signInFallbackRedirectUrl="/posts" />
      </SignedOut>

      <SignedIn>
        <div className="mx-auto max-w-4xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="font-serif text-3xl font-medium tracking-tight">
              My Posts
            </h1>{" "}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setRepublishTarget({ mode: "browse" })}
                disabled={rationAvailable === false}
                title={
                  rationAvailable === false
                    ? "You've already republished this week — your next one unlocks Sunday."
                    : undefined
                }
              >
                Republish
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? "Creating..." : "New Post"}
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-md border border-blue-500/30 bg-blue-50 dark:bg-blue-950/20 p-4">
            <Gift className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-500" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-200">
                Give an old post to a new friend
              </p>
              <p className="text-blue-900/80 dark:text-blue-200/80">
                Once a week, you can gift one of your published posts to a friend who joined
                after it came out and never got to see it. It lands in their next Sunday
                edition, under your name.
              </p>
            </div>
          </div>

          {posts && posts.length === 0 ? (
            <div className="rounded-md border p-6 text-sm text-muted-foreground">
              No posts yet. Create your first one!
            </div>
          ) : (
            <>
              {/* Mobile: stacked cards */}
              <div className="md:hidden space-y-3">
                {(posts ?? []).map((p) => (
                  <PostCard
                    key={p.id}
                    id={p.id}
                    title={p.title ?? "Untitled Post"}
                    status={p.status}
                    updatedAt={new Date(p.updatedAt)}
                    heroImageUrl={p.heroImageUrl ?? undefined}
                    onDelete={() => handleDeletePost(p.id)}
                    isDeleting={deletingId === p.id}
                    onRepublish={() => setRepublishTarget({ mode: "fromPost", postId: p.id })}
                  />
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                    <tr>
                      <th className="p-3 font-medium">Post</th>
                      <th className="p-3 font-medium text-center">Status</th>
                      <th className="p-3 font-medium text-center">Updated</th>
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
                        heroImageUrl={p.heroImageUrl ?? undefined}
                        onDelete={() => handleDeletePost(p.id)}
                        isDeleting={deletingId === p.id}
                        onRepublish={() => setRepublishTarget({ mode: "fromPost", postId: p.id })}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <RepublishModal
            target={republishTarget}
            onClose={() => setRepublishTarget(null)}
            onSent={refreshRationStatus}
          />
        </div>
      </SignedIn>
    </>
  );
}

