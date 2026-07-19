import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the editor page's hero + title + body layout.
export function EditorSkeleton() {
  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-56 w-full rounded-lg" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-9 w-full" />
      </div>
      <Skeleton className="h-60 w-full" />
    </div>
  );
}
