import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the row shape of AdminDashboard's posts/comments/reports tables —
// generic enough to cover all three tabs since they share the same
// header-row + n-column-cells structure.
export function AdminTableSkeleton({ columns = 5 }: { columns?: number }) {
  const rows = [0, 1, 2, 3, 4, 5];
  return (
    <div className="space-y-3 py-2">
      {rows.map((r) => (
        <div key={r} className="flex items-center gap-4">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
