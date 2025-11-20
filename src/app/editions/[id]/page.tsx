// src/app/editions/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Frontpage } from "@/components/Frontpage";
import { getDbUser } from "@/lib/getDbUser";
import { getPublishedEditionById } from "@/lib/editions";

export const dynamic = "force-dynamic";

type EditionResponse = {
  id: string;
  title?: string | null;
  weekStart: string;
  publishedAt?: string | null;
  posts: {
    id: string;
    title?: string | null;
    status: string;
    updatedAt: string;
    authorId: string;
    circleId?: string | null;
    audienceType: "ALL_USERS" | "FRIENDS" | "CIRCLE";
    circle?: { id: string; name: string } | null;
    author?: { id: string; name?: string | null; image?: string | null } | null;
    heroImageUrl?: string | null;
    // content?: string | null;
  }[];
};

export default async function EditionPage({
  params,
}: {
  params: { id: string };
}) {
  const { user, error } = await getDbUser();
  if (error) notFound();

  const edition = await getPublishedEditionById({ id: user.id }, params.id);
  if (!edition) notFound();

  // ✅ convert Dates -> strings
  const editionData: EditionResponse = {
    ...edition,
    weekStart: edition.weekStart.toISOString(),
    publishedAt: edition.publishedAt ? edition.publishedAt.toISOString() : null,
    posts: edition.posts.map((p) => ({
      ...p,
      updatedAt: p.updatedAt.toISOString(),
      status: p.status, // enum to string is fine
      heroImageUrl: p.heroImageUrl ?? undefined,
      // content: p.content ? tiptapExcerpt(p.content) : null,
    })),
  };

  const editionLabel =
    editionData.title ?? `Week of ${editionData.weekStart.slice(0, 10)}`;

  return (
    <div className="space-y-4">
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

      <Frontpage edition={editionData} />
    </div>
  );
}
