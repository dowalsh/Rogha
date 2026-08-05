import * as React from "react";
import { cn } from "@/lib/utils";

// Generic "hey, this is new — go check it out" signal: a small bright-green
// pill. Not feature-specific — pass an onClick (or wrap it as a Dialog/
// Popover trigger, see WeeklyJamExplainer's usage) to make it do something;
// on its own it's purely visual. Intended to be reused for other new
// features, not just Weekly Jam.
export const NewBadge = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "inline-flex items-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white shadow-sm hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-600",
      className,
    )}
    {...props}
  >
    New
  </button>
));
NewBadge.displayName = "NewBadge";
