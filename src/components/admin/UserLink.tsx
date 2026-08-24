import Link from "next/link";

export function UserLink({
  id,
  username,
  email,
}: {
  id: string;
  username: string;
  email?: string;
}) {
  return (
    <Link href={`/admin/users/${id}`} className="text-xs hover:underline">
      <span className="font-medium">{username}</span>
      {email && <span className="text-muted-foreground"> · {email}</span>}
    </Link>
  );
}
