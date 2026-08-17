"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-muted-foreground/40 text-[9px] leading-none text-muted-foreground cursor-help select-none"
        >
          i
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-56 text-center">{text}</TooltipContent>
    </Tooltip>
  );
}
