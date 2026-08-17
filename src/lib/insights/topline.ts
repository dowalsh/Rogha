// src/lib/insights/topline.ts
//
// The Topline reads pre-aggregated EditionSummary rows (cheap, bounded by
// edition count) and computes just the current/unsealed edition live —
// per docs/specs/2026-08-17-admin-insights-dashboard.md ("Performance &
// freshness").

import { prisma } from "@/lib/prisma";
import { formatWeekLabel } from "@/lib/utils";
import { computeEditionSummary, type EditionSummaryData } from "./edition";
import { getAllEditionsWithWindows } from "./windows";
import { mapWithConcurrency } from "./concurrency";

type Row = EditionSummaryData & { weekStart: Date; editionId: string };

export type ToplineSeriesKey =
  | "users"
  | "activeUsers"
  | "posts"
  | "wordsWritten"
  | "wordsRead"
  | "reach";

export type ToplineSeries = {
  key: ToplineSeriesKey;
  title: string;
  weeks: string[];
  weeklyValues: number[];
  cumulativeValues: number[];
  current: number | null;
  delta: number | null;
  activeRate: number | null;
  chartMode: "toggle" | "weekly" | "cumulative";
  format: "count" | "compact";
};

export type ToplineData = { series: ToplineSeries[]; hasData: boolean };

async function getRows(): Promise<Row[]> {
  const editions = await getAllEditionsWithWindows();
  if (editions.length === 0) return [];

  const stored = await prisma.editionSummary.findMany({
    where: { editionId: { in: editions.map((e) => e.id) } },
  });
  const storedMap = new Map(stored.map((s) => [s.editionId, s]));

  // Order matters (weekStart ascending) — mapWithConcurrency preserves
  // input order regardless of completion order. Most editions should hit
  // the `existing` branch (no query at all) once backfilled; concurrency is
  // capped for the rest so a mid-history gap can't fan out unbounded.
  const rows: Row[] = await mapWithConcurrency(editions, 3, async (ed) => {
    const existing = storedMap.get(ed.id);
    const data: EditionSummaryData = existing ?? (await computeEditionSummary(ed.id));
    return { ...data, weekStart: ed.weekStart, editionId: ed.id };
  });
  return rows;
}

function runningSum(values: number[]): number[] {
  let total = 0;
  return values.map((v) => (total += v));
}

export async function getTopline(): Promise<ToplineData> {
  const rows = await getRows();
  if (rows.length === 0) {
    return { series: [], hasData: false };
  }

  const weeks = rows.map((r) => formatWeekLabel(r.weekStart));
  const latest = rows[rows.length - 1];
  const previous = rows.length > 1 ? rows[rows.length - 2] : null;

  const usersWeekly = rows.map((r) => r.newSignups);
  const usersCumulative = rows.map((r) => r.totalUsers);
  const activeWeekly = rows.map((r) => r.activeUsers);
  const postsWeekly = rows.map((r) => r.postsCount);
  const wordsWrittenWeekly = rows.map((r) => r.wordsWritten);
  const wordsReadWeekly = rows.map((r) => r.wordsRead);

  const series: ToplineSeries[] = [
    {
      key: "users",
      title: "Users",
      weeks,
      weeklyValues: usersWeekly,
      cumulativeValues: usersCumulative,
      current: latest.totalUsers,
      delta: previous ? latest.totalUsers - previous.totalUsers : null,
      activeRate: null,
      chartMode: "toggle",
      format: "count",
    },
    {
      key: "activeUsers",
      title: "Active users",
      weeks,
      weeklyValues: activeWeekly,
      cumulativeValues: activeWeekly,
      current: latest.activeUsers,
      delta: previous ? latest.activeUsers - previous.activeUsers : null,
      activeRate: latest.totalUsers > 0 ? latest.activeUsers / latest.totalUsers : null,
      chartMode: "weekly",
      format: "count",
    },
    {
      key: "posts",
      title: "Posts",
      weeks,
      weeklyValues: postsWeekly,
      cumulativeValues: runningSum(postsWeekly),
      current: runningSum(postsWeekly).slice(-1)[0] ?? 0,
      delta: previous ? latest.postsCount - previous.postsCount : null,
      activeRate: null,
      chartMode: "toggle",
      format: "count",
    },
    {
      key: "wordsWritten",
      title: "Words written",
      weeks,
      weeklyValues: wordsWrittenWeekly,
      cumulativeValues: runningSum(wordsWrittenWeekly),
      current: runningSum(wordsWrittenWeekly).slice(-1)[0] ?? 0,
      delta: previous ? latest.wordsWritten - previous.wordsWritten : null,
      activeRate: null,
      chartMode: "toggle",
      format: "compact",
    },
    {
      key: "wordsRead",
      title: "Words read",
      weeks,
      weeklyValues: wordsReadWeekly,
      cumulativeValues: runningSum(wordsReadWeekly),
      current: runningSum(wordsReadWeekly).slice(-1)[0] ?? 0,
      delta: previous ? latest.wordsRead - previous.wordsRead : null,
      activeRate: null,
      chartMode: "toggle",
      format: "compact",
    },
    {
      key: "reach",
      title: "Reach",
      weeks,
      weeklyValues: usersWeekly,
      cumulativeValues: usersCumulative,
      current: latest.totalUsers,
      delta: previous ? latest.totalUsers - previous.totalUsers : null,
      activeRate: null,
      chartMode: "cumulative",
      format: "count",
    },
  ];

  return { series, hasData: true };
}
