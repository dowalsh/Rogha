"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";

type WeeklyAdminStats = {
  weeks: string[];
  signups: number[];
  posts: number[];
  wordCount: number[];
};

type ChartMode = "weekly" | "cumulative";

function cumulativeOf(values: number[]): number[] {
  let running = 0;
  return values.map((v) => (running += v));
}

function compactNumber(v: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(v);
}

// A single-series weekly bar chart. One hue, one metric per chart — no
// legend needed (the panel title already names the series). Bars get a
// hover tooltip since there's no other way to read an exact value once
// there are more weeks than fit comfortably as axis labels.
function WeeklyBarChart({
  labels,
  values,
  formatValue = (v: number) => v.toLocaleString(),
}: {
  labels: string[];
  values: number[];
  formatValue?: (v: number) => string;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const max = Math.max(1, ...values);

  if (labels.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No data yet.</p>;
  }

  return (
    <div>
      <div className="flex h-40 items-stretch gap-[2px]">
        {values.map((v, i) => {
          const heightPct = v === 0 ? 2 : Math.max(3, (v / max) * 100);
          const isHover = hoverIdx === i;
          return (
            <div
              key={labels[i]}
              className="group relative flex h-full min-w-[4px] flex-1 flex-col justify-end"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
            >
              {isHover && (
                <div className="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow">
                  {formatValue(v)}
                  <span className="block text-center text-[9px] opacity-70">{labels[i]}</span>
                </div>
              )}
              <div
                className={`w-full rounded-t-[4px] transition-colors ${
                  isHover ? "bg-primary" : "bg-primary/70"
                }`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{labels[0]}</span>
        {labels.length > 1 && <span>{labels[labels.length - 1]}</span>}
      </div>
    </div>
  );
}

function StatPanel({
  title,
  weeks,
  values,
  formatValue = (v: number) => v.toLocaleString(),
}: {
  title: string;
  weeks: string[];
  values: number[];
  formatValue?: (v: number) => string;
}) {
  const [mode, setMode] = useState<ChartMode>("weekly");
  const cumulative = useMemo(() => cumulativeOf(values), [values]);
  const total = cumulative[cumulative.length - 1] ?? 0;
  const chartValues = mode === "weekly" ? values : cumulative;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <p className="text-2xl font-semibold">{formatValue(total)}</p>
        </div>
        <div className="flex rounded-md border p-0.5 text-xs">
          <button
            onClick={() => setMode("weekly")}
            className={`rounded px-2 py-1 font-medium transition-colors ${
              mode === "weekly" ? "bg-muted" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setMode("cumulative")}
            className={`rounded px-2 py-1 font-medium transition-colors ${
              mode === "cumulative" ? "bg-muted" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Cumulative
          </button>
        </div>
      </div>
      <WeeklyBarChart labels={weeks} values={chartValues} formatValue={formatValue} />
    </div>
  );
}

export default function AdminStatsTab() {
  const [stats, setStats] = useState<WeeklyAdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => toast.error("Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  const showSkeleton = useDelayedLoading(loading);
  if (showSkeleton) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-56 animate-pulse rounded-lg border bg-muted/40" />
        ))}
      </div>
    );
  }
  if (loading || !stats) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatPanel title="Signups" weeks={stats.weeks} values={stats.signups} />
      <StatPanel title="Posts" weeks={stats.weeks} values={stats.posts} />
      <StatPanel
        title="Word count (posts + comments)"
        weeks={stats.weeks}
        values={stats.wordCount}
        formatValue={compactNumber}
      />
    </div>
  );
}
