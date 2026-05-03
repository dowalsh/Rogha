"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { EditionRevealOverlay } from "@/components/EditionRevealOverlay";
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/Spinner";
import { ChevronRight, ChevronDown, ArrowRight } from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

type EditionRow = {
  id: string;
  title?: string | null;
  weekStart: string;
  publishedAt?: string | null;
  posts: { id: string }[];
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
    audienceType: "ALL_USERS" | "FRIENDS" | "CIRCLE";
    circleId?: string | null;
    circle?: { id: string; name: string } | null;
    author?: { id: string; name?: string | null; image?: string | null } | null;
    heroImageUrl?: string | null;
  }>;
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
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
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
      const totalStories = eds.reduce((sum: number, ed: EditionRow) => sum + (ed.posts?.length ?? 0), 0);
      const sorted = [...eds].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
      months.push({ year, month, editions: sorted, totalStories });
    }
    months.sort((a, b) => b.month - a.month);
    const totalStories = months.reduce((sum: number, m: MonthGroup) => sum + m.totalStories, 0);
    yearGroups.push({ year, months, totalStories });
  }

  yearGroups.sort((a, b) => b.year - a.year);
  return yearGroups;
}

function getInitialCollapseState(groups: YearGroup[]) {
  if (groups.length === 0) return { expandedYears: new Set<number>(), expandedMonths: new Set<string>() };
  const currentYear = new Date().getFullYear();
  const topGroup = groups.find((g) => g.year === currentYear) ?? groups[0];
  const expandedYears = new Set([topGroup.year]);
  const expandedMonths = new Set<string>();
  if (topGroup.months.length > 0) {
    expandedMonths.add(monthKey(topGroup.months[0].year, topGroup.months[0].month));
  }
  return { expandedYears, expandedMonths };
}

// ── Archive sub-components ──────────────────────────────────────────────────

function WeekRow({ edition }: { edition: EditionRow }) {
  const postCount = edition.posts?.length ?? 0;
  return (
    <Link
      href={`/editions/${edition.id}`}
      className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted/50 transition-colors group"
    >
      <span className="text-sm font-medium group-hover:underline">
        {formatWeekDate(edition.weekStart)}
      </span>
      <span className="text-xs text-muted-foreground">{storyLabel(postCount)}</span>
    </Link>
  );
}

function MonthSection({
  group, isExpanded, onToggle,
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
          {isExpanded
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-none" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-none" />}
          <span className="text-sm font-semibold">{MONTH_NAMES[group.month - 1]}</span>
        </div>
        <span className="text-xs text-muted-foreground">{storyLabel(group.totalStories)}</span>
      </button>
      {isExpanded && (
        <div className="ml-5 mt-0.5 space-y-0.5">
          {group.editions.map((ed) => <WeekRow key={ed.id} edition={ed} />)}
        </div>
      )}
    </div>
  );
}

function YearSection({
  group, isExpanded, expandedMonths, onToggleYear, onToggleMonth,
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
          {isExpanded
            ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-none" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground flex-none" />}
          <span className="font-bold text-base">{group.year}</span>
        </div>
        <span className="text-xs text-muted-foreground">{storyLabel(group.totalStories)}</span>
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
    () => editions.filter((ed) => (ed.posts?.length ?? 0) > 0),
    [editions]
  );

  const groups = useMemo(() => groupEditions(filtered), [filtered]);

  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => new Set());
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    if (!initialised && groups.length > 0) {
      const { expandedYears: ey, expandedMonths: em } = getInitialCollapseState(groups);
      setExpandedYears(ey);
      setExpandedMonths(em);
      setInitialised(true);
    }
  }, [groups, initialised]);

  function toggleYear(year: number) {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year); else next.add(year);
      return next;
    });
  }

  function toggleMonth(key: string) {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
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

// ── Latest Edition preview (single-link block) ─────────────────────────────

type FullEditionPost = FullEdition["posts"][number];

function StoryLead({ post }: { post: FullEditionPost }) {
  return (
    <div className="border-b pb-8">
      {post.heroImageUrl && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted mb-4">
          <img src={post.heroImageUrl} alt={post.title ?? ""} className="h-full w-full object-cover" />
        </div>
      )}
      <h2 className="text-4xl font-black leading-tight">{post.title ?? "Untitled"}</h2>
      {post.author?.name && (
        <p className="mt-2 text-sm text-muted-foreground">{post.author.name}</p>
      )}
    </div>
  );
}

function StoryCard({ post }: { post: FullEditionPost }) {
  return (
    <div className="border bg-card p-3 space-y-2">
      {post.heroImageUrl && (
        <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
          <img src={post.heroImageUrl} alt={post.title ?? ""} className="h-full w-full object-cover" />
        </div>
      )}
      <h3 className="text-base font-semibold leading-snug">{post.title ?? "Untitled"}</h3>
      {post.author?.name && (
        <p className="text-xs text-muted-foreground">{post.author.name}</p>
      )}
    </div>
  );
}

function LatestEditionPreview({ edition }: { edition: FullEdition }) {
  const router = useRouter();
  const [fading, setFading] = useState(false);
  const showOverlay = !edition.hasOpened;

  const handleReveal = () => {
    setFading(true);
    setTimeout(() => router.push(`/editions/${edition.id}`), 200);
  };

  const [lead, ...rest] = edition.posts;
  const dateLabel = formatWeekDate(edition.weekStart);

  return (
    <div className="relative rounded-md border overflow-hidden">
      {showOverlay && (
        <EditionRevealOverlay
          editionId={edition.id}
          viewerCount={edition.viewerCount}
          viewerNames={edition.viewerNames}
          fading={fading}
          onReveal={handleReveal}
          mode="inline"
        />
      )}
      <Link
        href={`/editions/${edition.id}`}
        className={`block group space-y-6 p-6 transition-colors ${
          showOverlay ? "pointer-events-none" : "hover:border-foreground/40 hover:shadow-sm"
        }`}
      >
        {/* Date + arrow */}
        <div className="flex items-center justify-between border-b pb-3 font-serif">
          <p className="text-sm italic text-muted-foreground">{dateLabel}</p>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </div>

        {edition.posts.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground uppercase tracking-widest font-bold text-sm">
            No stories this week
          </p>
        ) : (
          <div className="font-serif space-y-6">
            {lead && <StoryLead post={lead} />}
            {rest.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => <StoryCard key={post.id} post={post} />)}
              </div>
            )}
          </div>
        )}
      </Link>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function EditionsPage() {
  const [editions, setEditions] = useState<EditionRow[] | null>(null);
  const [latestEdition, setLatestEdition] = useState<FullEdition | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useUser();

  const fetchEditions = useCallback(async () => {
    setLoadingList(true);
    setMsg(null);
    try {
      const res = await fetch("/api/editions", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: EditionRow[] = await res.json();
      setEditions(data);

      // Fetch full data for the latest edition so we can render story cards
      if (data.length > 0) {
        setLoadingLatest(true);
        try {
          const r2 = await fetch(`/api/editions/${data[0].id}`, { cache: "no-store" });
          if (r2.ok) setLatestEdition(await r2.json());
        } finally {
          setLoadingLatest(false);
        }
      }
    } catch {
      setEditions([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchEditions();
  }, [fetchEditions]);

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
      if (!res.ok) throw new Error(data?.error || res.statusText || "Publish failed");
      if (data.published) {
        setMsg(`Published edition ${data.editionId} • posts updated: ${data.postsPublished ?? 0}`);
      } else {
        setMsg(data.reason === "ALREADY_PUBLISHED" ? "Already published." : "Nothing to publish for last week.");
      }
      await fetchEditions();
    } catch (e: any) {
      setMsg(e.message || "Publish failed.");
    } finally {
      setPublishing(false);
    }
  };

  const archiveEditions = editions?.slice(1) ?? [];

  return (
    <>
      <SignedOut>
        <RedirectToSignIn signInFallbackRedirectUrl="/editions" />
      </SignedOut>

      <SignedIn>
        <div className="mx-auto max-w-5xl space-y-12 py-4">

          {/* Admin controls */}
          {process.env.NODE_ENV === "development" && (
            <div className="flex items-center gap-3">
              <Button onClick={handlePublishLastWeek} disabled={publishing} variant="outline" size="sm">
                {publishing ? "Publishing…" : "Manually publish last week"}
              </Button>
              {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
            </div>
          )}

          {/* ── Section 1: Latest Edition ─────────────────────────────── */}
          <section className="space-y-4">
            <h2 className="font-serif text-sm font-semibold uppercase tracking-widest text-muted-foreground border-b pb-2">
              Latest Edition
            </h2>

            {loadingList || loadingLatest ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : latestEdition ? (
              <LatestEditionPreview edition={latestEdition} />
            ) : (
              <p className="py-12 text-center text-muted-foreground">No editions published yet.</p>
            )}
          </section>

          {/* ── Section 2: Past Editions ──────────────────────────────── */}
          {!loadingList && archiveEditions.length > 0 && (
            <section className="space-y-4 font-serif">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground border-b pb-2">
                Past Editions
              </h2>
              <EditionsArchive editions={archiveEditions} />
            </section>
          )}

        </div>
      </SignedIn>
    </>
  );
}
