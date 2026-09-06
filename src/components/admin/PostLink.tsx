import Link from "next/link";

export function PostLink({ id, title }: { id: string; title: string | null }) {
  return (
    <Link href={`/admin/posts/${id}`} className="hover:underline">
      {title ?? <span className="italic text-muted-foreground">Untitled</span>}
    </Link>
  );
}
