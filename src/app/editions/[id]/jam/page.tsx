// src/app/editions/[id]/jam/page.tsx
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getDbUser } from "@/lib/getDbUser";
import { getPublishedEditionById } from "@/lib/editions";
import { jamPreviewFromRows } from "@/lib/jam";
import { WeeklyJamRows } from "@/components/jam/WeeklyJamRows";
import { WeeklyJamExplainer } from "@/components/jam/WeeklyJamExplainer";
import { NewBadge } from "@/components/ui/new-badge";

export const dynamic = "force-dynamic";

export default async function WeeklyJamPage({
  params,
}: {
  params: { id: string };
}) {
  const { user, error } = await getDbUser();
  if (error) notFound();

  const edition = await getPublishedEditionById({ id: user.id }, params.id);
  if (!edition) notFound();

  const editionLabel =
    edition.title ?? `Week of ${edition.weekStart.toISOString().slice(0, 10)}`;
  const { rows, viewerConnected } = edition.weeklyJam;
  const { ownImageUrl } = jamPreviewFromRows(rows);

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <Link
        href={`/editions/${edition.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to edition
      </Link>

      {/* HERO IMAGE — viewer's own track art, never a friend's */}
      {ownImageUrl && (
        <div className="space-y-2">
          <div className="relative w-full h-96 overflow-hidden rounded-lg bg-muted">
            <Image
              src={ownImageUrl}
              alt="Weekly Jam"
              fill
              sizes="768px"
              className="object-contain"
              priority
            />
          </div>
        </div>
      )}

      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold leading-tight">Weekly Jam</h1>
          {!viewerConnected && <WeeklyJamExplainer trigger={<NewBadge />} />}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{editionLabel}</span>
        </div>
      </header>

      <WeeklyJamRows rows={rows} viewerConnected={viewerConnected} />
    </div>
  );
}
