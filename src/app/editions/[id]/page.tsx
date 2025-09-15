// src/app/editions/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Frontpage } from "@/components/Frontpage";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type EditionResponse = {
  id: string;
  title?: string | null;
  weekStart: string; // force string ISO
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
  const edition = await prisma.edition.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      weekStart: true,
      posts: {
        where: { status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          author: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });

  if (!edition) notFound();

  const editionData: EditionResponse = {
    ...edition,
    weekStart: edition.weekStart.toISOString(), // ensure string type
  };

  const editionLabel =
    editionData.title ?? `Week of ${editionData.weekStart.slice(0, 10)}`;

  return (
    <div className="space-y-4">
      {/* Back button */}

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

      {/* Newspaper-style section */}
      <Frontpage edition={editionData} />
    </div>
  );
}
