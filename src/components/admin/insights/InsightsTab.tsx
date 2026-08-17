"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ToplineSection from "./ToplineSection";
import FunnelSection from "./FunnelSection";
import RosterSection from "./RosterSection";

const SUB_TABS = ["topline", "funnel", "roster"] as const;
type SubTab = (typeof SUB_TABS)[number];

// The active sub-tab lives in the URL (?insightsTab=roster) rather than
// local state, so a user drilling into a roster row and hitting "back" can
// land back on the Roster sub-tab instead of always resetting to Topline.
export default function InsightsTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const requested = searchParams.get("insightsTab");
  const value: SubTab = SUB_TABS.includes(requested as SubTab) ? (requested as SubTab) : "topline";

  function onValueChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("insightsTab", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList>
        <TabsTrigger value="topline">Topline</TabsTrigger>
        <TabsTrigger value="funnel">Funnel</TabsTrigger>
        <TabsTrigger value="roster">Roster</TabsTrigger>
      </TabsList>
      <TabsContent value="topline" className="mt-4">
        <ToplineSection />
      </TabsContent>
      <TabsContent value="funnel" className="mt-4">
        <FunnelSection />
      </TabsContent>
      <TabsContent value="roster" className="mt-4">
        <RosterSection />
      </TabsContent>
    </Tabs>
  );
}
