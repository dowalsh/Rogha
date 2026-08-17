"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { ToplineStatPanel } from "./charts";
import type { ToplineData } from "@/lib/insights/topline";

export default function ToplineSection() {
  const [data, setData] = useState<ToplineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/insights/topline")
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error("Failed to load topline"))
      .finally(() => setLoading(false));
  }, []);

  const showSkeleton = useDelayedLoading(loading);
  if (showSkeleton) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-lg border bg-muted/40" />
        ))}
      </div>
    );
  }
  if (loading || !data) return null;

  if (!data.hasData) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No published editions yet — the Topline fills in once the first edition goes out.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.series.map((s) => (
        <ToplineStatPanel
          key={s.key}
          title={s.title}
          weeks={s.weeks}
          weeklyValues={s.weeklyValues}
          cumulativeValues={s.cumulativeValues}
          current={s.current}
          delta={s.delta}
          chartMode={s.chartMode}
          activeRate={s.activeRate}
          format={s.format}
        />
      ))}
    </div>
  );
}
