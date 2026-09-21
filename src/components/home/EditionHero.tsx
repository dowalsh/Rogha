// src/components/home/EditionHero.tsx
"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HeroData } from "@/lib/home";

const pillClass =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-[0.16em]";

const cardBase = "rounded-xl border bg-background/60 p-4 sm:p-6 space-y-4";

type EditionHeroProps = {
  hero: HeroData;
};

export function EditionHero({ hero }: EditionHeroProps) {
  // No edition/no visible posts last week — the hero has nothing to say, so
  // it doesn't render at all (Coming Sunday, rendered by the caller, is what
  // stays persistent).
  if (hero.kind === "empty") {
    return null;
  }

  if (hero.state === "NOT_OPENED") {
    const pillLabel = hero.isReleaseDay ? "Just published · today" : "Not opened";
    const headline = hero.isReleaseDay
      ? "Last week's edition just dropped"
      : "You haven't opened last week's edition yet";
    const subtitle = hero.isReleaseDay
      ? `${hero.totalCount} stories from your friends · be the first in.`
      : `${hero.totalCount} stories waiting.`;

    return (
      <section className={cn(cardBase, "border-2 border-accent")}>
        <div className="space-y-2">
          <span className={pillClass}>{pillLabel}</span>
          <h2 className="font-serif text-2xl font-bold leading-tight">{headline}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {hero.teaserThumbUrls.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
            {hero.teaserThumbUrls.map((url, i) => (
              <div
                key={i}
                className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="h-full w-full scale-110 object-cover blur-sm"
                />
              </div>
            ))}
          </div>
        )}

        <Button asChild>
          <Link href={`/editions/${hero.editionId}`}>Open last week</Link>
        </Button>
      </section>
    );
  }

  if (hero.state === "PARTIAL") {
    return (
      <section className={cardBase}>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-xl font-bold">Keep reading last week</h2>
            <span className="text-sm text-muted-foreground">
              {hero.openedCount} of {hero.totalCount}
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: hero.totalCount }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  i < hero.openedCount ? "bg-foreground" : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>

        <Button asChild>
          <Link href={`/editions/${hero.editionId}`}>
            Finish the {hero.unreadPostIds.length} you missed
          </Link>
        </Button>
      </section>
    );
  }

  // CAUGHT_UP, but still release day — stays loud (accent card, reveal-card
  // energy) rather than dropping straight to the subtle reread prompt below;
  // it only downgrades once release day has passed (see docs audit).
  if (hero.isReleaseDay) {
    return (
      <section className={cn(cardBase, "border-2 border-accent")}>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <h2 className="font-serif text-xl font-bold leading-tight">
            You're all caught up on last week's edition
          </h2>
        </div>
        <Link
          href={`/editions/${hero.editionId}`}
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Reread
        </Link>
      </section>
    );
  }

  // CAUGHT_UP, past release day — subtle, out of the way.
  return (
    <section className={cardBase}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="text-sm">You're all caught up on last week's edition.</p>
        </div>
        <Link
          href={`/editions/${hero.editionId}`}
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Reread
        </Link>
      </div>
    </section>
  );
}
