"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { StatusPill } from "./StatusPill";
import { InfoTooltip } from "./InfoTooltip";
import { RECEPTION_EXPLAINER, CONSUMED_EXPLAINER, ISOLATED_EXPLAINER } from "./explainers";

type StatusBand = "ACTIVE" | "SLIPPING" | "DORMANT" | "NEVER_ACTIVATED" | "ONBOARDING";

type RosterRow = {
  id: string;
  username: string;
  email: string;
  status: StatusBand;
  lastActiveAt: string | null;
  joinedAt: string;
  friends: number;
  isolated: boolean;
  wrote: number;
  reception: number;
  consumed: number;
};

type SortKey =
  | "default"
  | "user"
  | "status"
  | "lastActive"
  | "joined"
  | "friends"
  | "wrote"
  | "reception"
  | "consumed";
type SortDir = "asc" | "desc";

const STATUS_PRIORITY: Record<StatusBand, number> = {
  SLIPPING: 0,
  DORMANT: 1,
  NEVER_ACTIVATED: 2,
  ONBOARDING: 3,
  ACTIVE: 4,
};

const STATUS_OPTIONS: { value: StatusBand; label: string }[] = [
  { value: "SLIPPING", label: "Slipping" },
  { value: "DORMANT", label: "Dormant" },
  { value: "NEVER_ACTIVATED", label: "Never activated" },
  { value: "ONBOARDING", label: "New" },
  { value: "ACTIVE", label: "Active" },
];

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} weeks ago`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export default function RosterSection() {
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<StatusBand>>(new Set());
  const [isolatedOnly, setIsolatedOnly] = useState(false);

  useEffect(() => {
    fetch("/api/admin/insights/roster")
      .then((r) => r.json())
      .then((data: { roster: RosterRow[] }) => setRoster(data.roster))
      .catch(() => toast.error("Failed to load roster"))
      .finally(() => setLoading(false));
  }, []);

  function toggleSort(key: SortKey, defaultDir: SortDir) {
    setSortKey((cur) => {
      if (cur === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDir(defaultDir);
      return key;
    });
  }

  function toggleStatusFilter(status: StatusBand) {
    setStatusFilter((cur) => {
      const next = new Set(cur);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roster.filter((r) => {
      if (statusFilter.size > 0 && !statusFilter.has(r.status)) return false;
      if (isolatedOnly && !r.isolated) return false;
      if (q && !r.username.toLowerCase().includes(q) && !r.email.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [roster, search, statusFilter, isolatedOnly]);

  const sorted = useMemo(() => {
    if (sortKey === "default") return filtered;
    const copy = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      switch (sortKey) {
        case "user":
          return dir * a.username.localeCompare(b.username);
        case "status":
          return dir * (STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]);
        case "lastActive":
          return (
            dir *
            ((a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0) -
              (b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0))
          );
        case "joined":
          return dir * (new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
        case "friends":
          return dir * (a.friends - b.friends);
        case "wrote":
          return dir * (a.wrote - b.wrote);
        case "reception":
          return dir * (a.reception - b.reception);
        case "consumed":
          return dir * (a.consumed - b.consumed);
        default:
          return 0;
      }
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const showSkeleton = useDelayedLoading(loading);
  if (showSkeleton) return <AdminTableSkeleton columns={7} />;
  if (loading) return null;

  const slippingCount = roster.filter((r) => r.status === "SLIPPING").length;

  const sortHeader = (key: SortKey, label: string, defaultDir: SortDir = "desc") => (
    <button
      onClick={() => toggleSort(key, defaultDir)}
      className={`inline-flex items-center gap-0.5 font-medium ${
        sortKey === key ? "text-foreground" : "hover:text-foreground"
      }`}
    >
      {label}
      {sortKey === key && <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>}
    </button>
  );

  return (
    <div className="space-y-4">
      {slippingCount === 0 ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Nobody&rsquo;s slipping this week. 🎉
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {slippingCount} {slippingCount === 1 ? "person is" : "people are"} slipping — worth a
          check-in.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search username or email…"
          className="rounded-md border bg-background px-2 py-1 text-sm w-48"
        />
        {STATUS_OPTIONS.map((opt) => {
          const active = statusFilter.has(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => toggleStatusFilter(opt.value)}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                active ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={isolatedOnly}
            onChange={(e) => setIsolatedOnly(e.target.checked)}
          />
          Isolated only
        </label>
        {(statusFilter.size > 0 || isolatedOnly || search) && (
          <button
            onClick={() => {
              setStatusFilter(new Set());
              setIsolatedOnly(false);
              setSearch("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear filters
          </button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {sorted.length} of {roster.length}
        </span>
      </div>

      {roster.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No users yet.</p>
      ) : sorted.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No users match these filters.</p>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="space-y-3 sm:hidden">
            {sorted.map((u) => (
              <Link
                key={u.id}
                href={`/admin/insights/${u.id}`}
                className="block rounded-lg border p-3 space-y-2 hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-sm">{u.username}</span>
                  <StatusPill status={u.status} />
                </div>
                <div className="text-xs text-muted-foreground">
                  Last active {relativeTime(u.lastActiveAt)} · Joined {fmtDate(u.joinedAt)}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {u.friends} friends{u.isolated && <span className="text-amber-700"> (isolated)</span>}
                  </span>
                  <span>{u.wrote} written</span>
                  <span>{u.reception} reception</span>
                  <span>{u.consumed} consumed</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4">{sortHeader("user", "User", "asc")}</th>
                  <th className="pb-2 pr-4">{sortHeader("status", "Status", "asc")}</th>
                  <th className="pb-2 pr-4">{sortHeader("lastActive", "Last active")}</th>
                  <th className="pb-2 pr-4">{sortHeader("joined", "Joined")}</th>
                  <th className="pb-2 pr-4">
                    <span className="inline-flex items-center gap-1">
                      {sortHeader("friends", "Friends")}
                      <InfoTooltip text={`Accepted friend count. Isolated: ${ISOLATED_EXPLAINER}`} />
                    </span>
                  </th>
                  <th className="pb-2 pr-4">{sortHeader("wrote", "Wrote")}</th>
                  <th className="pb-2 pr-4">
                    <span className="inline-flex items-center gap-1">
                      {sortHeader("reception", "Reception")}
                      <InfoTooltip text={RECEPTION_EXPLAINER} />
                    </span>
                  </th>
                  <th className="pb-2">
                    <span className="inline-flex items-center gap-1">
                      {sortHeader("consumed", "Consumed")}
                      <InfoTooltip text={CONSUMED_EXPLAINER} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sorted.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="py-3 pr-4">
                      <Link href={`/admin/insights/${u.id}`} className="hover:underline">
                        <span className="font-medium">{u.username}</span>
                        <span className="text-muted-foreground"> · {u.email}</span>
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <StatusPill status={u.status} />
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                      {relativeTime(u.lastActiveAt)}
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(u.joinedAt)}
                    </td>
                    <td className="py-3 pr-4">
                      {u.friends}
                      {u.isolated && <span className="ml-1 text-xs text-amber-700">isolated</span>}
                    </td>
                    <td className="py-3 pr-4">{u.wrote}</td>
                    <td className="py-3 pr-4">{u.reception}</td>
                    <td className="py-3">{u.consumed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
