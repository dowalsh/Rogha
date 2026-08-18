// src/components/PostRow.tsx
import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Button } from "@/components/ui/button";

const statusStyles = {
  DRAFT: "border-dashed",
  SUBMITTED: "bg-yellow-50 text-yellow-900 border-yellow-200",
  PUBLISHED: "bg-emerald-50 text-emerald-900 border-emerald-200",
  ARCHIVED: "bg-slate-50 text-slate-500 border-slate-200",
};

// Title + thumbnail block shared by PostRow/PostCard. `href: null` renders
// plain (non-clickable) text — used for republish instances awaiting Sunday,
// which have nowhere sensible to link to yet.
function PostTitleLink({
  href,
  heroImageUrl,
  title,
  className = "flex items-center gap-3",
}: {
  href: string | null;
  heroImageUrl?: string;
  title: string;
  className?: string;
}) {
  const content = (
    <>
      {heroImageUrl && (
        <div className="relative h-14 w-20 shrink-0 overflow-hidden">
          <Image src={heroImageUrl} alt="" fill sizes="80px" className="object-cover" />
        </div>
      )}
      <div className="min-w-0">
        <div
          className={`font-serif text-base leading-snug truncate ${href ? "underline-offset-4 hover:underline" : ""}`}
        >
          {title}
        </div>
      </div>
    </>
  );

  if (!href) {
    return <div className={className}>{content}</div>;
  }
  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

type PostRowProps = {
  title: string;
  id: string;
  status: "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED";
  edition?: { id: string; title: string }; // Update edition type
  updatedAt: Date;
  heroImageUrl?: string;
  onDelete?: () => void;
  isDeleting?: boolean;
  onRepublish?: () => void;
  isRepublish?: boolean;
};

export function PostRow({
  id,
  title,
  status,
  updatedAt,
  heroImageUrl,
  onDelete,
  isDeleting,
  onRepublish,
  isRepublish,
}: PostRowProps) {
  // A republish instance is created directly (skips DRAFT) and isn't meant
  // to be edited — /editor expects a normal draft-authored post, so opening
  // it for a republish instance shows a blank/broken editor state.
  const titleHref = isRepublish
    ? status === "PUBLISHED"
      ? `/reader/${id}`
      : null
    : `/editor/${id}`;

  return (
    <tr className="border-t">
      {/* POST COLUMN */}
      <td className="p-3 align-top">
        <PostTitleLink href={titleHref} heroImageUrl={heroImageUrl} title={title} />
      </td>

      {/* STATUS COLUMN */}
      <td className="p-3 align-top">
        <div className="flex flex-col items-center gap-1">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-[0.16em] ${statusStyles[status]}`}
          >
            {status.toLowerCase()}
          </span>
          {isRepublish && (
            <span className="inline-flex items-center rounded-full border border-blue-500/40 bg-blue-50 px-2.5 py-0.5 text-[11px] uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-950/20 dark:text-blue-400">
              Republish
            </span>
          )}

          {/* 👇 edition BELOW status badge (only when published) */}
          {/* {status === "PUBLISHED" && edition && (
            <span className="text-xs text-muted-foreground uppercase tracking-[0.16em]">
              In {edition.title}
            </span>
          )} */}
        </div>
      </td>

      {/* UPDATED COLUMN — to the minute */}
      <td className="p-3 align-top text-xs text-muted-foreground">
        {updatedAt.toLocaleString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>

      {/* ACTIONS COLUMN */}
      <td className="p-3 align-top">
        <div className="flex justify-end gap-2">
          {isRepublish && status !== "PUBLISHED" ? (
            <span className="px-2 text-xs text-muted-foreground">Awaiting Sunday</span>
          ) : (
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
          )}

          {status === "PUBLISHED" && onRepublish && (
            <Button variant="outline" size="sm" onClick={onRepublish}>
              Republish
            </Button>
          )}

          <ConfirmDelete
            trigger={
              <Button variant="ghost" size="icon" disabled={isDeleting}>
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            }
            onConfirm={onDelete!}
            isLoading={isDeleting}
            title="Delete post?"
            description="This action cannot be undone."
          />
        </div>
      </td>
    </tr>
  );
}

// Mobile card layout — same data as PostRow, stacked full-width instead of
// squeezed into table columns (avoids the horizontal-scroll-to-reach-actions
// problem a <table> has on narrow viewports).
export function PostCard({
  id,
  title,
  status,
  updatedAt,
  heroImageUrl,
  onDelete,
  isDeleting,
  onRepublish,
  isRepublish,
}: PostRowProps) {
  const titleHref = isRepublish
    ? status === "PUBLISHED"
      ? `/reader/${id}`
      : null
    : `/editor/${id}`;

  return (
    <div className="rounded-md border p-3 space-y-3">
      <PostTitleLink href={titleHref} heroImageUrl={heroImageUrl} title={title} />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-[0.16em] ${statusStyles[status]}`}
          >
            {status.toLowerCase()}
          </span>
          {isRepublish && (
            <span className="inline-flex items-center rounded-full border border-blue-500/40 bg-blue-50 px-2.5 py-0.5 text-[11px] uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-950/20 dark:text-blue-400">
              Republish
            </span>
          )}
        </div>
        <span>
          {updatedAt.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      <div className="flex gap-2">
        {isRepublish && status !== "PUBLISHED" ? (
          <span className="flex-1 px-2 py-1.5 text-xs text-muted-foreground">
            Awaiting Sunday
          </span>
        ) : (
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link href={status === "PUBLISHED" ? `/reader/${id}` : `/editor/${id}`}>
              {status === "PUBLISHED" ? "View" : "Edit"}
            </Link>
          </Button>
        )}

        {status === "PUBLISHED" && onRepublish && (
          <Button variant="outline" size="sm" onClick={onRepublish}>
            Republish
          </Button>
        )}

        <ConfirmDelete
          trigger={
            <Button variant="outline" size="sm" disabled={isDeleting}>
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          }
          onConfirm={onDelete!}
          isLoading={isDeleting}
          title="Delete post?"
          description="This action cannot be undone."
        />
      </div>
    </div>
  );
}
