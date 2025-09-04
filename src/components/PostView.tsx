// src/components/PostView.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { title } from "process";

type PostViewProps = {
  title: string;
  id: string;
  status: "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED";
  edition?: string;
  updatedAt: Date;
};

export function PostView({
  id,
  title,
  status,
  edition,
  updatedAt,
}: PostViewProps) {
  return (
    <tr className="border-t">
      <td className="p-3">
        <Link href={`/editor/${id}`} className="underline underline-offset-2">
          {title}
        </Link>
      </td>
      <td className="p-3">{status}</td>
      <td className="p-3">{edition ?? "—"}</td>
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
