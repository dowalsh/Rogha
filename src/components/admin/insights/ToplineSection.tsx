"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { ToplineStatPanel } from "./charts";
import type { ToplineData } from "@/lib/insights/topline";

function BackfillButton({ onDone }: { onDone: () => void }) {
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    try {
      const res = await fetch("/api/admin/insights/backfill", { method: "POST" });
      if (!res.ok) throw new Error();
      const result: { computed: number; alreadyPresent: number } = await res.json();
      toast.success(
        result.computed === 0
          ? "Nothing to backfill — every sealed edition already has a snapshot."
          : `Computed ${result.computed} missing snapshot${result.computed === 1 ? "" : "s"} (${result.alreadyPresent} already present).`,
      );
      onDone();
    } catch {
      toast.error("Backfill failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <button
      onClick={run}
      disabled={running}
      className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
      title="Compute and store snapshots for any sealed edition that doesn't have one yet — historical editions that predate this feature won't have a stored snapshot until this runs, so Topline falls back to computing them live (slow) until then."
    >
      {running ? "Backfilling…" : "Backfill historical snapshots"}
    </button>
  );
}

export default function ToplineSection() {
  const [data, setData] = useState<ToplineData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/insights/topline")
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error("Failed to load topline"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showSkeleton = useDelayedLoading(loading);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <BackfillButton onDone={load} />
      </div>

      {showSkeleton && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg border bg-muted/40" />
          ))}
        </div>
      )}

      {!loading && data && !data.hasData && (
        <p className="py-12 text-center text-muted-foreground">
          No published editions yet — the Topline fills in once the first edition goes out.
        </p>
      )}

      {!loading && data && data.hasData && (
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
      )}
    </div>
  );
}
