// src/components/PostRow.tsx
import Link from "next/link";

const statusStyles = {
  DRAFT: "border-dashed",
  SUBMITTED: "bg-yellow-50 text-yellow-900 border-yellow-200",
  PUBLISHED: "bg-emerald-50 text-emerald-900 border-emerald-200",
  ARCHIVED: "bg-slate-50 text-slate-500 border-slate-200",
};

import { Button } from "@/components/ui/button";
type PostRowProps = {
  title: string;
  id: string;
  status: "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED";
  edition?: { id: string; title: string }; // Update edition type
  updatedAt: Date;
  heroImageUrl?: string;
};

export function PostRow({
  id,
  title,
  status,
  updatedAt,
  heroImageUrl,
}: PostRowProps) {
  return (
    <tr className="border-t align-middle">
      {/* POST COLUMN */}
      <td className="p-3">
        <Link href={`/editor/${id}`} className="flex items-center gap-3">
          {heroImageUrl && (
            <div className="h-14 w-20 overflow-hidden ">
              <img
                src={heroImageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div>
            <div className="font-serif text-base leading-snug underline-offset-4 hover:underline">
              {title}
            </div>
          </div>
        </Link>
      </td>

      {/* STATUS COLUMN */}
      <td className="p-3 align-middle">
        <div className="flex flex-col items-center gap-1">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-[0.16em] ${statusStyles[status]}`}
          >
            {status.toLowerCase()}
          </span>

          {/* 👇 edition BELOW status badge (only when published) */}
          {/* {status === "PUBLISHED" && edition && (
            <span className="text-xs text-muted-foreground uppercase tracking-[0.16em]">
              In {edition.title}
            </span>
          )} */}
        </div>
      </td>

      {/* UPDATED COLUMN — to the minute */}
      <td className="p-3 align-middle text-xs text-muted-foreground">
        {updatedAt.toLocaleString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>

      {/* ACTIONS COLUMN */}
      <td className="p-3 align-middle">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link
              href={
                status === "PUBLISHED"
                  ? `/reader/${id}` // 👈 VIEW MODE
                  : `/editor/${id}` // 👈 EDIT MODE
              }
            >
              {status === "PUBLISHED" ? "View" : "Edit"}
            </Link>
          </Button>
        </div>
      </td>
    </tr>
  );
}
