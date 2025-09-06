// src/app/editions/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { PostCard } from "@/components/PostCard";

export const dynamic = "force-dynamic"; // optional while iterating

export default async function EditionPage({
  params,
}: {
  params: { id: string };
}) {
  const edition = await prisma.edition.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      weekStart: true,
      posts: {
        where: { status: "PUBLISHED" },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          author: { select: { name: true } },
        },
      },
    },
  });

  if (!edition) notFound();

  const editionLabel =
    edition.title ?? `Week of ${edition.weekStart.toISOString().slice(0, 10)}`;

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
