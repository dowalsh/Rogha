// src/app/editions/[id]/jam/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getDbUser } from "@/lib/getDbUser";
import { getPublishedEditionById } from "@/lib/editions";
import { markWeeklyJamViewed } from "@/lib/jam";
import { WeeklyJamRows } from "@/components/jam/WeeklyJamRows";
import { WeeklyJamInfoDot } from "@/components/jam/WeeklyJamInfoDot";

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

  await markWeeklyJamViewed(user.id, edition.id);

  const editionLabel =
    edition.title ?? `Week of ${edition.weekStart.toISOString().slice(0, 10)}`;
  const { rows, viewerConnected } = edition.weeklyJam;

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <Link
        href={`/editions/${edition.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to edition
      </Link>

      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold leading-tight">The Weekly Jam</h1>
          <WeeklyJamInfoDot />
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{editionLabel}</span>
        </div>
      </header>

      <WeeklyJamRows rows={rows} viewerConnected={viewerConnected} />
    </div>
  );
}
