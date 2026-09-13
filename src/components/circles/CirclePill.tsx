import { cn } from "@/lib/utils";

export type CircleRef = { id: string; name: string };

// Single source of truth for how a circle's name renders as a pill,
// anywhere in the app — restyle here, not at each call site.
export function CirclePill({
  name,
  onClick,
  className,
}: {
  name: string;
  onClick?: () => void;
  className?: string;
}) {
  const classes = cn(
    "inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground",
    onClick && "hover:bg-accent",
    className,
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {name}
      </button>
    );
  }
  return <span className={classes}>{name}</span>;
}

// Renders up to `max` circle pills, folding the remainder into a static
// "+N" pill (never clickable — there's no per-circle destination to send
// an overflow tap to).
export function CirclePillGroup({
  circles,
  max,
  onCircleClick,
  className,
}: {
  circles: CircleRef[];
  max?: number;
  onCircleClick?: (circle: CircleRef) => void;
  className?: string;
}) {
  const shown = max != null ? circles.slice(0, max) : circles;
  const overflow = circles.length - shown.length;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {shown.map((circle) => (
        <CirclePill
          key={circle.id}
          name={circle.name}
          onClick={onCircleClick ? () => onCircleClick(circle) : undefined}
        />
      ))}
      {overflow > 0 && <CirclePill name={`+${overflow}`} />}
    </span>
  );
}

// A sentence naming every circle a post/thread is visible to, e.g.
// "Comments visible to [Pill], [Pill] only." When `hiddenCount` is nonzero
// (the viewer isn't in every target circle), the trailing clause turns
// orange — the "there are people here you don't share a circle with" flag.
export function CircleAudienceLine({
  circles,
  hiddenCount,
  prefix,
  suffix = "only.",
  hiddenLabel = "& others.",
  onCircleClick,
  className,
}: {
  circles: CircleRef[];
  hiddenCount: number;
  prefix: string;
  suffix?: string;
  hiddenLabel?: string;
  onCircleClick?: (circle: CircleRef) => void;
  className?: string;
}) {
  if (circles.length === 0) return null;

  return (
    <p className={cn("flex flex-wrap items-center gap-1.5 text-sm italic text-muted-foreground", className)}>
      <span>{prefix}</span>
      {circles.map((circle, i) => (
        <span key={circle.id} className="inline-flex items-center gap-1">
          <CirclePill
            name={circle.name}
            onClick={onCircleClick ? () => onCircleClick(circle) : undefined}
          />
          {i < circles.length - 1 && <span>,</span>}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span className="not-italic font-medium text-orange-500">{hiddenLabel}</span>
      ) : (
        <span>{suffix}</span>
      )}
    </p>
  );
}
