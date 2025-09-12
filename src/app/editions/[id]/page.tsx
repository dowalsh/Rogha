"use client";

// src/app/editions/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { PostCard } from "@/components/PostCard";

export const dynamic = "force-dynamic";

type EditionResponse = {
  id: string;
  title?: string | null;
  weekStart: string; // comes from API as ISO
  posts: {
    id: string;
    title?: string | null;
    author?: { id: string; name?: string | null; image?: string | null } | null;
  }[];
};

export default async function EditionPage({
  params,
}: {
  params: { id: string };
}) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/editions/${params.id}`,
    { cache: "no-store" }
  );

  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`Failed to load edition: ${res.status}`);

  const edition: EditionResponse = await res.json();

  const editionLabel =
    edition.title ??
    `Week of ${new Date(edition.weekStart).toISOString().slice(0, 10)}`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <Link href="/editions">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Back to editions"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <CardTitle>{editionLabel}</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {edition.posts.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground">
              No published posts yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {edition.posts.map((p) => (
                <PostCard
                  key={p.id}
                  id={p.id}
                  title={p.title ?? "Untitled Post"}
                  authorName={p.author?.name ?? "Unknown author"}
                  href={`/reader/${p.id}`}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
