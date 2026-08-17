"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ToplineSection from "./ToplineSection";
import FunnelSection from "./FunnelSection";
import RosterSection from "./RosterSection";

export default function InsightsTab() {
  return (
    <Tabs defaultValue="topline">
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
