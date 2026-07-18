import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors SettingsPage's notification-preferences card + toggle rows.
export function SettingsSkeleton() {
  const rows = [0, 1, 2, 3];
  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      <Skeleton className="h-8 w-32" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <Skeleton className="h-5 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 px-6 py-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-9 rounded-full" />
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
          {rows.map((i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 px-6 py-3"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-9 rounded-full" />
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
