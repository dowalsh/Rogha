"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StatusPill } from "@/components/admin/insights/StatusPill";
import { InfoTooltip } from "@/components/admin/insights/InfoTooltip";
import {
  RECEPTION_EXPLAINER,
  CONSUMED_EXPLAINER,
  ISOLATED_EXPLAINER,
} from "@/components/admin/insights/explainers";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import type { UserInsights } from "@/lib/insights/userDrilldown";

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

function Section({
  title,
  info,
  children,
}: {
  title: string;
  info?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold">
        {title}
        {info && <InfoTooltip text={info} />}
      </h2>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-medium">{value}</div>
    </div>
  );
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<UserInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/insights/roster/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const showSkeleton = useDelayedLoading(loading);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/admin/users"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to users
      </Link>

      {showSkeleton && <div className="h-64 animate-pulse rounded-lg border bg-muted/40" />}
      {!loading && error && <p className="text-muted-foreground">Couldn&rsquo;t load this user.</p>}

      {!loading && data && (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{data.username}</h1>
              <p className="text-sm text-muted-foreground">{data.email}</p>
            </div>
            <StatusPill status={data.status} />
          </div>

          <Section title="At a glance">
            <p className="text-sm">{data.headline}</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat label="Joined" value={fmtDate(data.joinedAt as unknown as string)} />
              <Stat label="Last active" value={fmtDateTime(data.lastActiveAt as unknown as string)} />
            </div>
          </Section>

          <Section
            title="Network"
            info={`Friend count, pending requests, and circles. Isolated: ${ISOLATED_EXPLAINER}`}
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat
                label="Friends"
                value={data.network.isolated ? `${data.network.friends} (isolated)` : data.network.friends}
              />
              <Stat label="Pending in" value={data.network.pendingIncoming} />
              <Stat label="Pending out" value={data.network.pendingOutgoing} />
              <Stat label="Circles" value={data.network.circles.length} />
            </div>
            {data.network.circles.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {data.network.circles.map((c) => c.name).join(", ")}
              </p>
            )}
          </Section>

          <Section title="How they were received" info={RECEPTION_EXPLAINER}>
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Reads received" value={data.reception.totalReads} />
              <Stat label="Comments received" value={data.reception.totalComments} />
              <Stat label="Likes received" value={data.reception.totalLikes} />
            </div>
          </Section>

          <Section title="What they wrote">
            {data.posts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No published posts.</p>
            ) : (
              <div className="divide-y">
                {data.posts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/admin/posts/${p.id}`}
                    className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {p.title ?? <span className="italic text-muted-foreground">Untitled</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p.editionTitle ?? "No edition"} · {fmtDate(p.createdAt as unknown as string)}
                      </div>
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                      {p.reads} reads · {p.comments} comments · {p.likes} likes
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          <Section title="What they consumed" info={CONSUMED_EXPLAINER}>
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Posts read" value={data.consumed.postsRead} />
              <Stat label="Comments given" value={data.consumed.commentsGiven} />
              <Stat label="Likes given" value={data.consumed.likesGiven} />
            </div>
          </Section>

          <Section title="Timeline">
            <div className="grid grid-cols-3 gap-4">
              <Stat label="Last post read" value={fmtDateTime(data.timeline.lastPostRead as unknown as string)} />
              <Stat
                label="Last post written"
                value={fmtDateTime(data.timeline.lastPostWritten as unknown as string)}
              />
              <Stat
                label="Last comment"
                value={fmtDateTime(data.timeline.lastCommentGiven as unknown as string)}
              />
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
