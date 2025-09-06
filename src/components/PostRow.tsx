// src/components/PostRow.tsx
import Link from "next/link";

import { Button } from "@/components/ui/button";
type PostRowProps = {
  title: string;
  id: string;
  status: "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED";
  edition?: { id: string; title: string }; // Update edition type
  updatedAt: Date;
};

export function PostRow({
  id,
  title,
  status,
  edition,
  updatedAt,
}: PostRowProps) {
  return (
    <tr className="border-t">
      <td className="p-3">
        <Link href={`/editor/${id}`} className="underline underline-offset-2">
          {title}
        </Link>
      </td>
      <td className="p-3">{status}</td>
      <td className="p-3">
        {edition ? (
          <Button asChild variant="link" size="sm" className="p-0 h-auto">
            <Link
              href={`/editions/${edition.id}`}
              aria-label={`Open ${edition.title}`}
            >
              {edition.title}
            </Link>
          </Button>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="p-3">
        {new Intl.DateTimeFormat("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(updatedAt)}
      </td>
      <td className="p-3">
        <Link href={`/editor/${id}`}>
          <Button variant="secondary" size="sm">
            Edit
          </Button>
        </Link>
      </td>
    </tr>
  );
}
