// src/components/home/EditionHero.tsx
"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComingSunday } from "@/components/home/ComingSunday";
import { cn } from "@/lib/utils";
import type { HeroData, ComingNextData } from "@/lib/home";

const pillClass =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-[0.16em]";

const cardBase = "rounded-xl border bg-background/60 p-4 sm:p-6 space-y-4";

type EditionHeroProps = {
  hero: HeroData;
  comingNext: ComingNextData;
};

function ComingSundaySlot({
  comingNext,
  collapsed,
}: {
  comingNext: ComingNextData;
  collapsed: boolean;
}) {
  if (!comingNext.visible) return null;
  return (
    <div className="border-t pt-3">
      <ComingSunday data={comingNext} collapsed={collapsed} />
    </div>
  );
}

export function EditionHero({ hero, comingNext }: EditionHeroProps) {
  if (hero.kind === "empty") {
    return (
      <section className={cardBase}>
        <p className="font-serif text-xl">No editions yet</p>
        <p className="text-sm text-muted-foreground">
          Once your friends start submitting posts, they'll come together into
          your first weekly edition. In the meantime, explore what's already
          here or write the first post yourself.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/editions">Explore editions</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/posts">Write a post</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (hero.state === "NOT_OPENED") {
    const pillLabel = hero.isReleaseDay ? "Just published · today" : "Not opened";
    const headline = hero.isReleaseDay
      ? "This week's edition just dropped"
      : "You haven't opened this week yet";
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
          <div className="flex gap-2">
            {hero.teaserThumbUrls.slice(0, 6).map((url, i) => (
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
          <Link href={`/editions/${hero.editionId}`}>Open this week</Link>
        </Button>

        <ComingSundaySlot comingNext={comingNext} collapsed />
      </section>
    );
  }

  if (hero.state === "PARTIAL") {
    return (
      <section className={cardBase}>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-xl font-bold">Keep reading this week</h2>
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
          <Link href={`/reader/${hero.unreadPostIds[0]}?from=edition`}>
            Finish the {hero.unreadPostIds.length} you missed
          </Link>
        </Button>

        <ComingSundaySlot comingNext={comingNext} collapsed={false} />
      </section>
    );
  }

  // CAUGHT_UP
  return (
    <section className={cardBase}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        <p className="text-sm">You're all caught up this week.</p>
      </div>

      <ComingSundaySlot comingNext={comingNext} collapsed={false} />
    </section>
  );
}
