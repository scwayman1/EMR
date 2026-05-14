import React, { Suspense } from "react";
import { CanopyBoard } from "@/components/canopy/CanopyBoard";
import { CanopyCell } from "@/components/canopy/CanopyCell";

// Simulated fetch for rendering smoothness proof
async function fetchMetricData(id: string) {
  // In a real implementation, this reads from DB using global filters / overrides
  return {
    id,
    title: id === "active-patients" ? "Active Patients (30d)" : "Follow-up Compliance",
    currentValue: id === "active-patients" ? "1,204" : "86%",
    trendPercentage: id === "active-patients" ? 12 : -3,
    format: "number" as const,
    drilldownUrl: `/patients?cohort=${id}`,
  };
}

async function AsyncCell({ id }: { id: string }) {
  const data = await fetchMetricData(id);
  return <CanopyCell metric={data} />;
}

export default function AtlasPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CanopyBoard 
        title="The Canopy" 
        description="Unified data-display construct and organizational insight board."
      >
        <Suspense fallback={<CanopyCell metric={{ id: "load", title: "Loading...", currentValue: "-", format: "number", drilldownUrl: "#" }} isLoading={true} />}>
          <AsyncCell id="active-patients" />
        </Suspense>
        
        <Suspense fallback={<CanopyCell metric={{ id: "load", title: "Loading...", currentValue: "-", format: "number", drilldownUrl: "#" }} isLoading={true} />}>
          <AsyncCell id="compliance" />
        </Suspense>
      </CanopyBoard>
    </div>
  );
}
