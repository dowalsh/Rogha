// src/app/editions/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useMemo } from "react";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { FriendsCarousel } from "@/components/FriendsCarousel";

type EditionRow = {
  id: string;
  title?: string | null;
  weekStart: string; // ISO from API
  publishedAt?: string | null;
  _count?: { posts: number };
};

export default function EditionsPage() {
  const [editions, setEditions] = useState<EditionRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [refreshFollows, setRefreshFollows] = useState(0);

  const { user, isLoaded } = useUser();

  // Client-side admin check
  const isAdmin = useMemo(() => {
    if (!isLoaded) return false;
    const email =
      user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress ??
      "";
    const list =
      (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean) || [];
    return email ? list.includes(email.toLowerCase()) : false;
  }, [isLoaded, user]);

  const fetchEditions = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/editions", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: EditionRow[] = await res.json();
      setEditions(data);
    } catch (e: any) {
      console.error("Failed to load editions:", e);
      setEditions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEditions();
  }, [fetchEditions]);

  const handlePublishLastWeek = async () => {
    setPublishing(true);
    setMsg(null);
    try {
      console.log("[editions] publish button clicked");
      const res = await fetch("/api/cron/publish-weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      console.log("[editions] publish response", res.status, data);

      if (!res.ok) {
        throw new Error(data?.error || res.statusText || "Publish failed");
      }

      if (data.published) {
        setMsg(
          `Published edition ${data.editionId} • posts updated: ${
            data.postsPublished ?? 0
          }`
        );
      } else {
        setMsg(
          data.reason === "ALREADY_PUBLISHED"
            ? "Already published."
            : "Nothing to publish for last week."
        );
      }

      await fetchEditions();
    } catch (e: any) {
      setMsg(e.message || "Publish failed.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <SignedOut>
        <RedirectToSignIn redirectUrl="/editions" />
      </SignedOut>

      <SignedIn>
        <div className="space-y-8">
          <FriendsCarousel refreshKey={refreshFollows} />

          {/* Header */}
          <header className="border-b pb-4 text-center font-serif">
            <h1 className="text-5xl font-black uppercase tracking-wide">
              PUBLISHED Editions
            </h1>
            {isAdmin && (
              <div className="mt-3">
                <Button
                  onClick={handlePublishLastWeek}
                  disabled={publishing}
                  variant="default"
                >
                  {publishing ? "Publishing…" : "Manually publish last week"}
                </Button>
              </div>
            )}
            {msg && (
              <div className="pt-2 text-sm text-muted-foreground">{msg}</div>
            )}
          </header>

          {/* Editions list */}
          <div className="mx-auto max-w-3xl space-y-6 font-serif">
            {loading ? (
              <div className="text-center text-muted-foreground">Loading…</div>
            ) : !editions || editions.length === 0 ? (
              <div className="py-20 text-center text-2xl font-bold uppercase tracking-widest text-muted-foreground">
                No editions published yet
              </div>
            ) : (
              editions.map((ed) => {
                const label =
                  ed.title ??
                  `Week of ${new Date(ed.weekStart)
                    .toISOString()
                    .slice(0, 10)}`;
                const posts = ed._count?.posts ?? 0;
                return (
                  <Link
                    key={ed.id}
                    href={`/editions/${ed.id}`}
                    className="block border-b pb-4 hover:bg-muted/40 transition"
                  >
                    <h2 className="text-2xl font-extrabold hover:underline">
                      {label}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {posts > 0
                        ? `${posts} stor${posts === 1 ? "y" : "ies"}`
                        : "No stories"}
                    </p>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </SignedIn>
    </>
  );
}
