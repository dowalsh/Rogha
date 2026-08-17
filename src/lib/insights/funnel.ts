// src/lib/insights/funnel.ts

import { prisma } from "@/lib/prisma";
import { formatWeekLabel } from "@/lib/utils";
import { computeEditionSummary, type EditionSummaryData } from "./edition";
import { getAllEditionsWithWindows } from "./windows";

export type FunnelStep = {
  key:
    | "allUsers"
    | "active"
    | "opened"
    | "read"
    | "readAll"
    | "commented"
    | "wrote";
  label: string;
  value: number;
  denominatorLabel: string;
  denominator: number;
  pct: number | null; // null when denominator is 0 — render "—", not 0%
};

export type FunnelData = {
  editionId: string;
  editionLabel: string;
  isSealed: boolean;
  steps: FunnelStep[];
};

export type FunnelableEdition = { id: string; label: string; isSealed: boolean };

export async function getFunnelableEditions(): Promise<FunnelableEdition[]> {
  const editions = await getAllEditionsWithWindows();
  return editions
    .slice()
    .reverse()
    .map((e) => ({
      id: e.id,
      label: e.title ?? `Week of ${formatWeekLabel(e.weekStart)}`,
      isSealed: e.isSealed,
    }));
}

function pct(value: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return value / denominator;
}

function buildSteps(data: EditionSummaryData): FunnelStep[] {
  return [
    {
      key: "allUsers",
      label: "All users",
      value: data.funnelAllUsers,
      denominatorLabel: "of all users",
      denominator: data.funnelAllUsers,
      pct: pct(data.funnelAllUsers, data.funnelAllUsers),
    },
    {
      key: "active",
      label: "Active",
      value: data.funnelActive,
      denominatorLabel: "of all users",
      denominator: data.funnelAllUsers,
      pct: pct(data.funnelActive, data.funnelAllUsers),
    },
    {
      key: "opened",
      label: "Opened this edition",
      value: data.funnelOpened,
      denominatorLabel: "of Active users",
      denominator: data.funnelActive,
      pct: pct(data.funnelOpened, data.funnelActive),
    },
    {
      key: "read",
      label: "Read a post",
      value: data.funnelRead,
      denominatorLabel: "of openers",
      denominator: data.funnelOpened,
      pct: pct(data.funnelRead, data.funnelOpened),
    },
    {
      key: "readAll",
      label: "Read every post",
      value: data.funnelReadAll,
      denominatorLabel: "of openers",
      denominator: data.funnelOpened,
      pct: pct(data.funnelReadAll, data.funnelOpened),
    },
    {
      key: "commented",
      label: "Commented",
      value: data.funnelCommented,
      denominatorLabel: "of openers",
      denominator: data.funnelOpened,
      pct: pct(data.funnelCommented, data.funnelOpened),
    },
    {
      key: "wrote",
      label: "Wrote a post",
      value: data.funnelWrote,
      denominatorLabel: "of Active users",
      denominator: data.funnelActive,
      pct: pct(data.funnelWrote, data.funnelActive),
    },
  ];
}

export async function getFunnel(editionId?: string): Promise<FunnelData | null> {
  const editions = await getAllEditionsWithWindows();
  if (editions.length === 0) return null;

  // Default: latest *sealed* edition, falling back to the latest overall if
  // nothing is sealed yet (cold start).
  const sealed = editions.filter((e) => e.isSealed);
  const target = editionId
    ? editions.find((e) => e.id === editionId)
    : (sealed[sealed.length - 1] ?? editions[editions.length - 1]);
  if (!target) return null;

  const stored = await prisma.editionSummary.findUnique({ where: { editionId: target.id } });
  const data: EditionSummaryData = stored ?? (await computeEditionSummary(target.id));

  return {
    editionId: target.id,
    editionLabel: target.title ?? `Week of ${formatWeekLabel(target.weekStart)}`,
    isSealed: target.isSealed,
    steps: buildSteps(data),
  };
}
