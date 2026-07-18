// src/components/home/HomeContent.tsx
"use client";

import { useState } from "react";
import useSWR from "swr";
import { EditionHero } from "@/components/home/EditionHero";
import { BuzzList } from "@/components/home/BuzzList";
import { HomeSkeleton } from "@/components/home/HomeSkeleton";
import { LatestEditionPreloader } from "@/components/editions/LatestEditionPreloader";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import type { HomeData } from "@/lib/home";

const EARLIER_PAGE_SIZE = 15;

export function HomeContent() {
  const [earlierLimit, setEarlierLimit] = useState(EARLIER_PAGE_SIZE);

  const { data, isLoading } = useSWR<HomeData>(
    `/api/home?earlierLimit=${earlierLimit}`,
  );

  const showSkeleton = useDelayedLoading(isLoading || !data);

  if (showSkeleton) {
    return <HomeSkeleton />;
  }
  if (isLoading || !data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <EditionHero hero={data.hero} comingNext={data.comingNext} />
      <BuzzList
        buzz={data.buzz}
        onShowMore={() => setEarlierLimit((n) => n + EARLIER_PAGE_SIZE)}
      />
      <LatestEditionPreloader />
    </div>
  );
}
