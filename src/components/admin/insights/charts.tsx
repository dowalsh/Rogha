"use client";

import { useState } from "react";

export type ChartMode = "weekly" | "cumulative";

export function compactNumber(v: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(v);
}

// A single-series weekly bar chart. One hue, one metric per chart — no
// legend needed (the panel title already names the series). Bars get a
// hover tooltip since there's no other way to read an exact value once
// there are more weeks than fit comfortably as axis labels.
export function WeeklyBarChart({
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
      <div className="flex h-32 items-stretch gap-[2px]">
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

function DeltaBadge({ delta, format }: { delta: number | null; format: (v: number) => string }) {
  if (delta === null) return null;
  if (delta === 0) {
    return <span className="text-xs font-medium text-muted-foreground">no change</span>;
  }
  const up = delta > 0;
  return (
    <span className={`text-xs font-medium ${up ? "text-green-600" : "text-red-600"}`}>
      {up ? "+" : ""}
      {format(delta)} vs last edition
    </span>
  );
}

export function ToplineStatPanel({
  title,
  weeks,
  weeklyValues,
  cumulativeValues,
  current,
  delta,
  chartMode,
  activeRate,
  format = "count",
}: {
  title: string;
  weeks: string[];
  weeklyValues: number[];
  cumulativeValues: number[];
  current: number | null;
  delta: number | null;
  chartMode: "toggle" | "weekly" | "cumulative";
  activeRate?: number | null;
  format?: "count" | "compact";
}) {
  const [mode, setMode] = useState<ChartMode>(chartMode === "cumulative" ? "cumulative" : "weekly");
  const formatValue = format === "compact" ? compactNumber : (v: number) => v.toLocaleString();
  const chartValues = mode === "weekly" ? weeklyValues : cumulativeValues;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <p className="text-2xl font-semibold">{current === null ? "—" : formatValue(current)}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <DeltaBadge delta={delta} format={formatValue} />
            {activeRate !== null && activeRate !== undefined && (
              <span className="text-xs text-muted-foreground">
                {(activeRate * 100).toFixed(0)}% of total
              </span>
            )}
          </div>
        </div>
        {chartMode === "toggle" && (
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
        )}
      </div>
      <WeeklyBarChart labels={weeks} values={chartValues} formatValue={formatValue} />
    </div>
  );
}
