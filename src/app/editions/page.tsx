"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { EditionsListSkeleton } from "@/components/editions/EditionsListSkeleton";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { ChevronRight, ChevronDown } from "lucide-react";
import { type WeeklyJamData } from "@/lib/jam-preview";

// ── Types ───────────────────────────────────────────────────────────────────

// The archive list (getPublishedEditions) sends a lightweight precomputed
// preview; the rich latest-edition preview (getPublishedEditionById) sends
// the full row data — these are genuinely different API shapes.
type WeeklyJamPreview = { hasData: boolean; ownImageUrl: string | null };

type EditionRow = {
  id: string;
  title?: string | null;
  weekStart: string;
  publishedAt?: string | null;
  posts: {
    id: string;
    title?: string | null;
    officialKind?: "EDITORS_NOTE" | "COMMUNITY_FEATURE" | null;
    author?: { id: string; username?: string | null } | null;
  }[];
  weeklyJam?: WeeklyJamPreview | null;
};

type FullEdition = {
  id: string;
  title?: string | null;
  weekStart: string;
  publishedAt?: string | null;
  hasOpened: boolean;
  viewerCount: number;
  viewerNames: string[];
  posts: Array<{
    id: string;
    title?: string | null;
    audienceType: "ALL_USERS" | "FRIENDS" | "CIRCLE" | "RECIPIENTS";
    circleId?: string | null;
    officialKind?: "EDITORS_NOTE" | "COMMUNITY_FEATURE" | null;
    circle?: { id: string; name: string } | null;
    author?: { id: string; username?: string | null; image?: string | null } | null;
    heroImageUrl?: string | null;
    heroThumbUrl?: string | null;
    heroThumbBlurUrl?: string | null;
  }>;
  weeklyJam?: WeeklyJamData | null;
};

// ── Grouping helpers ────────────────────────────────────────────────────────

type MonthGroup = {
  year: number;
  month: number;
  editions: EditionRow[];
  totalStories: number;
};

type YearGroup = {
  year: number;
  months: MonthGroup[];
  totalStories: number;
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function parseWeekStartParts(weekStart: string) {
  const [year, month, day] = weekStart.slice(0, 10).split("-").map(Number);
  return { year, month, day };
}

function formatWeekDate(weekStart: string): string {
  const { year, month, day } = parseWeekStartParts(weekStart);
  return `${MONTH_ABBR[month - 1]} ${day}, ${year}`;
}

function storyLabel(count: number): string {
  if (count === 0) return "No stories";
  if (count === 1) return "1 story";
  return `${count} stories`;
}

function monthKey(year: number, month: number): string {
  return `${year}-${month}`;
}

function groupEditions(editions: EditionRow[]): YearGroup[] {
  const yearMap = new Map<number, Map<number, EditionRow[]>>();

  for (const ed of editions) {
    const { year, month } = parseWeekStartParts(ed.weekStart);
    if (!yearMap.has(year)) yearMap.set(year, new Map());
    const monthMap = yearMap.get(year)!;
    if (!monthMap.has(month)) monthMap.set(month, []);
    monthMap.get(month)!.push(ed);
  }

  const yearGroups: YearGroup[] = [];

  for (const [year, monthMap] of Array.from(yearMap)) {
    const months: MonthGroup[] = [];
    for (const [month, eds] of Array.from(monthMap)) {
      const totalStories = eds.reduce(
        (sum: number, ed: EditionRow) => sum + (ed.posts?.length ?? 0),
        0,
      );
      const sorted = [...eds].sort((a, b) =>
        b.weekStart.localeCompare(a.weekStart),
      );
      months.push({ year, month, editions: sorted, totalStories });
    }
    months.sort((a, b) => b.month - a.month);
    const totalStories = months.reduce(
      (sum: number, m: MonthGroup) => sum + m.totalStories,
      0,
    );
    yearGroups.push({ year, months, totalStories });
  }

  yearGroups.sort((a, b) => b.year - a.year);
  return yearGroups;
}

function getInitialCollapseState(groups: YearGroup[]) {
  if (groups.length === 0)
    return {
      expandedYears: new Set<number>(),
      expandedMonths: new Set<string>(),
    };
  const currentYear = new Date().getFullYear();
  const topGroup = groups.find((g) => g.year === currentYear) ?? groups[0];
  const expandedYears = new Set([topGroup.year]);
  const expandedMonths = new Set<string>();
  if (topGroup.months.length > 0) {
    expandedMonths.add(
      monthKey(topGroup.months[0].year, topGroup.months[0].month),
    );
  }
  return { expandedYears, expandedMonths };
}

// ── Archive sub-components ──────────────────────────────────────────────────

function WeekRow({ edition }: { edition: EditionRow }) {
  return (
    <Link
      href={`/editions/${edition.id}`}
      className="block py-2 px-3 rounded hover:bg-muted/50 transition-colors group"
    >
      <span className="text-sm font-medium group-hover:underline">
        {formatWeekDate(edition.weekStart)}
      </span>
      {(edition.posts.length > 0 || edition.weeklyJam?.hasData) && (
        <ul className="mt-1 space-y-0.5">
          {edition.posts.map((post) => (
            <li
              key={post.id}
              className="text-xs text-muted-foreground truncate"
            >
              {post.title ?? "Untitled"}
              {post.officialKind != null
                ? " — Rogha"
                : post.author?.username
                  ? ` — ${post.author.username}`
                  : ""}
            </li>
          ))}
          {edition.weeklyJam?.hasData && (
            <li className="text-xs text-muted-foreground truncate">The Weekly Jam</li>
          )}
        </ul>
      )}
    </Link>
  );
}

function MonthSection({
  group,
  isExpanded,
  onToggle,
}: {
  group: MonthGroup;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full py-1.5 px-2 rounded hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-1.5">
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-none" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-none" />
          )}
          <span className="text-sm font-semibold">
            {MONTH_NAMES[group.month - 1]}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {storyLabel(group.totalStories)}
        </span>
      </button>
      {isExpanded && (
        <div className="ml-5 mt-0.5 space-y-0.5">
          {group.editions.map((ed) => (
            <WeekRow key={ed.id} edition={ed} />
          ))}
        </div>
      )}
    </div>
  );
}

function YearSection({
  group,
  isExpanded,
  expandedMonths,
  onToggleYear,
  onToggleMonth,
}: {
  group: YearGroup;
  isExpanded: boolean;
  expandedMonths: Set<string>;
  onToggleYear: () => void;
  onToggleMonth: (key: string) => void;
}) {
  return (
    <div className="border rounded-md overflow-hidden">
      <button
        onClick={onToggleYear}
        className="flex items-center justify-between w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-none" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-none" />
          )}
          <span className="font-bold text-base">{group.year}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {storyLabel(group.totalStories)}
        </span>
      </button>
      {isExpanded && (
        <div className="px-3 py-2 space-y-1">
          {group.months.map((m) => {
            const key = monthKey(m.year, m.month);
            return (
              <MonthSection
                key={key}
                group={m}
                isExpanded={expandedMonths.has(key)}
                onToggle={() => onToggleMonth(key)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function EditionsArchive({ editions }: { editions: EditionRow[] }) {
  const filtered = useMemo(
    () => editions.filter((ed) => (ed.posts?.length ?? 0) > 0 || ed.weeklyJam?.hasData),
    [editions],
  );

  const groups = useMemo(() => groupEditions(filtered), [filtered]);

  const [expandedYears, setExpandedYears] = useState<Set<number>>(
    () => new Set(),
  );
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(
    () => new Set(),
  );
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    if (!initialised && groups.length > 0) {
      const { expandedYears: ey, expandedMonths: em } =
        getInitialCollapseState(groups);
      setExpandedYears(ey);
      setExpandedMonths(em);
      setInitialised(true);
    }
  }, [groups, initialised]);

  function toggleYear(year: number) {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  function toggleMonth(key: string) {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No past editions.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((yg) => (
        <YearSection
          key={yg.year}
          group={yg}
          isExpanded={expandedYears.has(yg.year)}
          expandedMonths={expandedMonths}
          onToggleYear={() => toggleYear(yg.year)}
          onToggleMonth={toggleMonth}
        />
      ))}
    </div>
  );
}

// ── Latest Edition teaser ────────────────────────────────────────────────────

// This is intentionally a lightweight teaser — headline, count, thumbnail
// strip — not the full story grid. The actual reveal-with-social-proof
// ritual (EditionRevealOverlay) lives on the edition page itself;
// duplicating it here made /editions feel like the edition page before
// you'd actually navigated to it.
//
// Pre-open, thumbs use the heavily-blurred `heroThumbBlurUrl` to build
// suspense (same asset the home hero uses). Once opened — even partially —
// we switch to the clear `heroThumbUrl` so the teaser stays interesting
// without re-hiding stories the viewer has already read.
function LatestEditionTeaser({ edition }: { edition: FullEdition }) {
  const dateLabel = formatWeekDate(edition.weekStart);
  const hasJam = (edition.weeklyJam?.rows.length ?? 0) > 0;
  const totalCount = edition.posts.length + (hasJam ? 1 : 0);
  const thumbUrls = edition.posts
    .map((post) => (edition.hasOpened ? post.heroThumbUrl : post.heroThumbBlurUrl))
    .filter((url): url is string => !!url);

  if (totalCount === 0) {
    return (
      <div className="rounded-xl border p-6 text-center text-muted-foreground">
        No stories this week
      </div>
    );
  }

  const thumbStrip = thumbUrls.length > 0 && (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
      {thumbUrls.map((url, i) => (
        <div key={i} className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-full w-full scale-110 object-cover" />
        </div>
      ))}
    </div>
  );

  if (edition.hasOpened) {
    return (
      <div className="rounded-xl border p-6 space-y-4">
        <div className="space-y-2">
          <p className="text-sm italic text-muted-foreground">{dateLabel}</p>
          <div className="flex items-center justify-between gap-2">
            <p className="font-serif text-xl font-bold">This week's edition</p>
            <Link
              href={`/editions/${edition.id}`}
              className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Reread
            </Link>
          </div>
        </div>

        {thumbStrip}
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-accent p-6 space-y-4">
      <div className="space-y-2">
        <p className="text-sm italic text-muted-foreground">{dateLabel}</p>
        <h2 className="font-serif text-2xl font-bold leading-tight">This week's edition</h2>
        <p className="text-sm text-muted-foreground">
          {totalCount} {totalCount === 1 ? "story" : "stories"} waiting.
        </p>
      </div>

      {thumbStrip}

      <Button asChild>
        <Link href={`/editions/${edition.id}`}>Open this week</Link>
      </Button>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function EditionsPage() {
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useUser();

  // The full archive list — not preloaded from the home feed (unbounded,
  // per-edition query), but cached here so revisiting /editions is instant.
  const {
    data: editions,
    isLoading: loadingList,
    mutate: mutateEditions,
  } = useSWR<EditionRow[]>("/api/editions");

  const latestId = editions?.[0]?.id;

  // Same key LatestEditionPreloader seeds from the home feed (it returns
  // identical data to this endpoint for the latest edition) — if that ran
  // first, this resolves from cache instantly instead of refetching.
  const { data: latestEdition, isLoading: loadingLatest } =
    useSWR<FullEdition>(latestId ? `/api/editions/${latestId}` : null);

  const handlePublishLastWeek = async () => {
    setPublishing(true);
    setMsg(null);
    try {
      const res = await fetch("/api/cron/publish-weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data?.error || res.statusText || "Publish failed");
      if (data.published) {
        setMsg(
          `Published edition ${data.editionId} • posts updated: ${data.postsPublished ?? 0}`,
        );
      } else {
        setMsg(
          data.reason === "ALREADY_PUBLISHED"
            ? "Already published."
            : "Nothing to publish for last week.",
        );
      }
      // Revalidating the list is enough — if a new edition just got
      // published, `latestId` changes and useSWR refetches under the new
      // key automatically.
      await mutateEditions();
    } catch (e: any) {
      setMsg(e.message || "Publish failed.");
    } finally {
      setPublishing(false);
    }
  };

  const archiveEditions = editions?.slice(1) ?? [];
  const loading = loadingList || loadingLatest;
  const showSkeleton = useDelayedLoading(loading);

  return (
    <>
      <SignedOut>
        <RedirectToSignIn signInFallbackRedirectUrl="/editions" />
      </SignedOut>

      <SignedIn>
        {showSkeleton ? (
          <EditionsListSkeleton />
        ) : loading ? null : (
          <div className="mx-auto max-w-5xl space-y-12 py-4">
            {/* Admin controls */}
            {(process.env.NODE_ENV === "development" ||
              process.env.NEXT_PUBLIC_VERCEL_ENV === "preview") && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={handlePublishLastWeek}
                  disabled={publishing}
                  variant="outline"
                  size="sm"
                >
                  {publishing ? "Publishing…" : "Manually publish last week"}
                </Button>
                {msg && (
                  <span className="text-sm text-muted-foreground">{msg}</span>
                )}
              </div>
            )}

            {/* ── Section 1: Latest Edition ─────────────────────────────── */}
            <section className="space-y-4">
              <h2 className="font-serif text-sm font-semibold uppercase tracking-widest text-muted-foreground border-b pb-2">
                Latest Edition
              </h2>

              {latestEdition ? (
                <LatestEditionTeaser edition={latestEdition} />
              ) : (
                <p className="py-12 text-center text-muted-foreground">
                  No editions published yet.
                </p>
              )}
            </section>

            {/* ── Section 2: Past Editions ──────────────────────────────── */}
            {archiveEditions.length > 0 && (
              <section className="space-y-4 font-serif">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground border-b pb-2">
                  Past Editions
                </h2>
                <EditionsArchive editions={archiveEditions} />
              </section>
            )}
          </div>
        )}
      </SignedIn>
    </>
  );
}
