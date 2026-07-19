import { Skeleton } from "@/components/ui/skeleton";

// Mirrors EditionsPage's "Latest Edition" section (StoryLead + StoryCard
// grid) so the loading state and loaded content occupy the same shape.
export function EditionsListSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-12 py-4">
      <section className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="rounded-md border p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </div>
          <div className="space-y-6">
            <div className="space-y-4">
              <Skeleton className="aspect-[16/9] w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-2/3" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-[4/3] w-full" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
