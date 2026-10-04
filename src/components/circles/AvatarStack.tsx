import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type StackMember = { id: string; username: string; image?: string | null };

function initialsFor(username: string) {
  return username.slice(0, 2).toUpperCase();
}

// Overlapping avatar row — up to `max` circles, remainder folded into a
// trailing "+N" label. Used anywhere a circle's membership needs a glance
// (circle card, circle page's member opener).
export function AvatarStack({
  members,
  max = 5,
  size = "sm",
  className,
}: {
  members: StackMember[];
  max?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const shown = members.slice(0, max);
  const overflow = members.length - shown.length;
  const dimension = size === "md" ? "h-8 w-8" : "h-6 w-6";

  return (
    <span className={cn("inline-flex items-center", className)}>
      <span className="inline-flex">
        {shown.map((m, i) => (
          <Avatar
            key={m.id}
            className={cn(dimension, "ring-2 ring-background", i > 0 && "-ml-2")}
          >
            <AvatarImage src={m.image ?? undefined} alt={m.username} />
            <AvatarFallback className="text-[10px]">
              {initialsFor(m.username)}
            </AvatarFallback>
          </Avatar>
        ))}
      </span>
      {overflow > 0 && (
        <span className="ml-1.5 text-xs text-muted-foreground">
          and {overflow} more
        </span>
      )}
    </span>
  );
}
