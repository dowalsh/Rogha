import { Skeleton } from "@/components/ui/skeleton";

// Shown immediately on navigation while the force-dynamic edition page's
// server render (Prisma query) is still in flight — mirrors Frontpage's
// lead + secondary story layout so the transition doesn't feel like a blank
// pause.
export default function EditionLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-32" />

      <section className="border-b pb-8">
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr] lg:items-stretch">
          <Skeleton className="aspect-[16/9] w-full" />
          <div className="flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-2/3" />
            </div>
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2 border bg-card p-3">
            <Skeleton className="aspect-[4/3] w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
