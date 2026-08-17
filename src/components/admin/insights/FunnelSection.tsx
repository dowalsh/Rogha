"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import type { FunnelData, FunnelableEdition } from "@/lib/insights/funnel";

function pctLabel(pct: number | null): string {
  return pct === null ? "—" : `${Math.round(pct * 100)}%`;
}

function FunnelStepBar({
  label,
  value,
  denominatorLabel,
  pct,
  max,
}: {
  label: string;
  value: number;
  denominatorLabel: string;
  pct: number | null;
  max: number;
}) {
  const widthPct = max > 0 ? Math.max(2, (value / max) * 100) : 2;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {value.toLocaleString()} · {pctLabel(pct)} {denominatorLabel}
        </span>
      </div>
      <div className="h-3 w-full rounded bg-muted">
        <div
          className="h-3 rounded bg-primary/70"
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

export default function FunnelSection() {
  const [editions, setEditions] = useState<FunnelableEdition[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = selectedId
      ? `/api/admin/insights/funnel?editionId=${encodeURIComponent(selectedId)}`
      : "/api/admin/insights/funnel";
    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((data: { funnel: FunnelData | null; editions: FunnelableEdition[] }) => {
        setEditions(data.editions);
        setFunnel(data.funnel);
        if (!selectedId && data.funnel) setSelectedId(data.funnel.editionId);
      })
      .catch(() => toast.error("Failed to load funnel"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const showSkeleton = useDelayedLoading(loading);
  if (showSkeleton && !funnel) {
    return <div className="h-72 animate-pulse rounded-lg border bg-muted/40" />;
  }

  if (!loading && editions.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No published editions yet — the Funnel fills in once the first edition goes out.
      </p>
    );
  }

  if (!funnel) return null;

  const max = funnel.steps[0]?.value ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">{funnel.editionLabel}</h3>
          {!funnel.isSealed && (
            <p className="text-xs text-muted-foreground">
              Current edition — live, not yet sealed. Numbers may still change.
            </p>
          )}
        </div>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-md border bg-background px-2 py-1 text-sm"
        >
          {editions.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
              {e.isSealed ? "" : " (current)"}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        {funnel.steps.map((step) => (
          <FunnelStepBar
            key={step.key}
            label={step.label}
            value={step.value}
            denominatorLabel={step.denominatorLabel}
            pct={step.pct}
            max={max}
          />
        ))}
      </div>
    </div>
  );
}
