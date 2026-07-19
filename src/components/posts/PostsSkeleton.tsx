import { Skeleton } from "@/components/ui/skeleton";

// Mirrors PostsPage's mobile card list / desktop table rows.
export function PostsSkeleton() {
  const rows = [0, 1, 2, 3, 4];
  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-3">
        {rows.map((i) => (
          <div key={i} className="rounded-md border p-3 space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-md border">
        <div className="space-y-0 divide-y">
          {rows.map((i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
