import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the reader page's hero + title + body layout.
export function ReaderSkeleton() {
  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <Skeleton className="h-9 w-32" />
      <Skeleton className="h-96 w-full rounded-lg" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
