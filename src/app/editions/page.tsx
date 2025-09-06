// src/app/editions/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useMemo } from "react";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type EditionRow = {
  id: string;
  title?: string | null;
  weekStart: string; // ISO from API
  publishedAt?: string | null;
  _count?: { posts: number };
};

// test

export default function EditionsPage() {
  const [editions, setEditions] = useState<EditionRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { user, isLoaded } = useUser();

  // determine admin on the client using a public env var
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
      const res = await fetch("/api/editions/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);

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
        <div className="space-y-4">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Editions</CardTitle>

                {/* Show publish button ONLY for admins */}
                {isAdmin && (
                  <Button onClick={handlePublishLastWeek} disabled={publishing}>
                    {publishing ? "Publishing…" : "Publish last week"}
                  </Button>
                )}
              </div>
              {msg && (
                <div className="pt-2 text-sm text-muted-foreground">{msg}</div>
              )}
            </CardHeader>

            <CardContent className="p-4">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : !editions || editions.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No published editions yet.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {editions.map((ed) => {
                    const label =
                      ed.title ??
                      `Week of ${new Date(ed.weekStart)
                        .toISOString()
                        .slice(0, 10)}`;
                    const posts = ed._count?.posts ?? 0;
                    return (
                      <Link key={ed.id} href={`/editions/${ed.id}`}>
                        <Button variant="secondary">
                          {label}
                          {posts > 0
                            ? ` • ${posts} post${posts === 1 ? "" : "s"}`
                            : ""}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SignedIn>
    </>
  );
}
