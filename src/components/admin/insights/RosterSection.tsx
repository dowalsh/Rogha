"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { StatusPill } from "./StatusPill";

type RosterRow = {
  id: string;
  username: string;
  email: string;
  status: "ACTIVE" | "SLIPPING" | "DORMANT" | "NEVER_ACTIVATED" | "ONBOARDING";
  lastActiveAt: string | null;
  joinedAt: string;
  friends: number;
  isolated: boolean;
  wrote: number;
  reception: number;
  consumed: number;
};

type SortKey = "default" | "friends" | "wrote" | "reception" | "consumed" | "joined";

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

  useEffect(() => {
    fetch("/api/admin/insights/roster")
      .then((r) => r.json())
      .then((data: { roster: RosterRow[] }) => setRoster(data.roster))
      .catch(() => toast.error("Failed to load roster"))
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    if (sortKey === "default") return roster;
    const copy = [...roster];
    copy.sort((a, b) => {
      switch (sortKey) {
        case "friends":
          return b.friends - a.friends;
        case "wrote":
          return b.wrote - a.wrote;
        case "reception":
          return b.reception - a.reception;
        case "consumed":
          return b.consumed - a.consumed;
        case "joined":
          return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
        default:
          return 0;
      }
    });
    return copy;
  }, [roster, sortKey]);

  const showSkeleton = useDelayedLoading(loading);
  if (showSkeleton) return <AdminTableSkeleton columns={7} />;
  if (loading) return null;

  const slippingCount = roster.filter((r) => r.status === "SLIPPING").length;

  const sortHeader = (key: SortKey, label: string) => (
    <button
      onClick={() => setSortKey((cur) => (cur === key ? "default" : key))}
      className={`font-medium ${sortKey === key ? "text-foreground" : "hover:text-foreground"}`}
    >
      {label}
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

      {roster.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No users yet.</p>
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
                  <th className="pb-2 pr-4 font-medium">User</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Last active</th>
                  <th className="pb-2 pr-4">{sortHeader("joined", "Joined")}</th>
                  <th className="pb-2 pr-4">{sortHeader("friends", "Friends")}</th>
                  <th className="pb-2 pr-4">{sortHeader("wrote", "Wrote")}</th>
                  <th className="pb-2 pr-4">{sortHeader("reception", "Reception")}</th>
                  <th className="pb-2 font-medium">{sortHeader("consumed", "Consumed")}</th>
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
