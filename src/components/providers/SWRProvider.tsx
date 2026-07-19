"use client";

import { SWRConfig } from "swr";
import { fetcher } from "@/lib/swr";

// App-wide SWR cache so client-fetched data (buzz feed, circles, likers,
// latest edition, etc.) survives navigation between pages instead of
// refetching from scratch every time a component remounts.
export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        dedupingInterval: 5000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
