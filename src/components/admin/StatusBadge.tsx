const COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-500",
  SUBMITTED: "bg-yellow-100 text-yellow-700",
  PUBLISHED: "bg-blue-100 text-blue-700",
  ARCHIVED: "bg-gray-100 text-gray-400",
  REMOVED: "bg-red-100 text-red-700",
  ACTIVE: "bg-green-50 text-green-600",
  PENDING: "bg-yellow-100 text-yellow-700",
  ACTIONED: "bg-green-100 text-green-700",
  DISMISSED: "bg-gray-100 text-gray-500",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
        COLOR[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
}
