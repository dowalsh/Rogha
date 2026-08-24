import ToplineSection from "@/components/admin/insights/ToplineSection";
import FunnelSection from "@/components/admin/insights/FunnelSection";

export default function InsightsOverview() {
  return (
    <div className="space-y-10">
      <ToplineSection />
      <FunnelSection />
    </div>
  );
}
