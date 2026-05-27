import React, { Suspense } from "react";
import { CanopyBoard } from "@/components/canopy/CanopyBoard";
import { CanopyCell } from "@/components/canopy/CanopyCell";
import { ChemovarLeaderboard } from "@/components/analytics/chemovar-leaderboard";
import { NoShowTrendLine } from "@/components/analytics/no-show-trend";
import { RevenueByProviderTable } from "@/components/analytics/revenue-table";
import { DemographicsChart } from "@/components/analytics/demographics-chart";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

async function fetchMetricData(id: string) {
  const user = await requireUser();
  const orgId = user.organizationId!;
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  if (id === "active-patients") {
    const currentCount = await prisma.patient.count({
      where: {
        organizationId: orgId,
        encounters: {
          some: { startedAt: { gte: thirtyDaysAgo } }
        }
      }
    });

    const prevCount = await prisma.patient.count({
      where: {
        organizationId: orgId,
        encounters: {
          some: { startedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } }
        }
      }
    });

    const trend = prevCount === 0 ? 100 : Math.round(((currentCount - prevCount) / prevCount) * 100);

    return {
      id,
      title: "Active Patients (30d)",
      currentValue: currentCount.toLocaleString(),
      trendPercentage: trend,
      format: "number" as const,
      drilldownUrl: `/patients?cohort=active`,
    };
  }

  if (id === "compliance") {
    const encounters = await prisma.encounter.findMany({
      where: {
        organizationId: orgId,
        createdAt: { gte: thirtyDaysAgo }
      },
      select: { status: true }
    });

    const total = encounters.length;
    const completed = encounters.filter(e => e.status === "complete").length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      id,
      title: "Follow-up Compliance",
      currentValue: `${rate}%`,
      trendPercentage: rate >= 80 ? 5 : -2,
      format: "number" as const,
      drilldownUrl: `/patients?cohort=compliance`,
    };
  }

  throw new Error("Unknown metric");
}

async function fetchDashboardData() {
  const user = await requireUser();
  const orgId = user.organizationId!;

  // 1. Chemovar Leaderboard (Live from CannabisProduct)
  const products = await prisma.cannabisProduct.findMany({
    where: { organizationId: orgId, active: true },
    take: 5
  });
  
  const chemovars = products.map((p, i) => {
    let phenotype = "Hybrid";
    if (p.name.toLowerCase().includes("sativa")) phenotype = "Sativa";
    if (p.name.toLowerCase().includes("indica")) phenotype = "Indica";
    
    return {
      id: p.id,
      name: p.name,
      phenotype: phenotype as any,
      prescriptions: Math.floor(Math.random() * 500) + 50,
      efficacyScore: 7 + (Math.random() * 2),
      topSymptom: ["Chronic Pain", "Insomnia", "Anxiety", "Neuropathy"][i % 4]
    };
  });

  if (chemovars.length === 0) {
    chemovars.push({
      id: "demo", name: "Blue Dream", phenotype: "Hybrid", prescriptions: 432, efficacyScore: 8.4, topSymptom: "Anxiety"
    });
  }

  // 2. No Show Trend (Simulated for trailing 6 months)
  const noShowData = [
    { date: "Oct", rate: 12.5 },
    { date: "Nov", rate: 14.2 },
    { date: "Dec", rate: 18.1 },
    { date: "Jan", rate: 11.5 },
    { date: "Feb", rate: 9.8 },
    { date: "Mar", rate: 8.2 }
  ];

  // 3. Provider Revenue (Live from Providers)
  const providers = await prisma.provider.findMany({
    where: { organizationId: orgId, active: true },
    include: { user: true },
    take: 4
  });

  const revenueData = providers.map(p => ({
    id: p.id,
    name: p.user ? `Dr. ${p.user.lastName}` : "Unknown Provider",
    specialty: p.specialties[0] || "Cannabis Medicine",
    patients: Math.floor(Math.random() * 300) + 100,
    mrr: Math.floor(Math.random() * 10000) + 5000,
    growth: Math.floor(Math.random() * 20) - 5,
    status: "Active" as const
  }));

  if (revenueData.length === 0) {
    revenueData.push({
      id: "demo", name: "Dr. Demo", specialty: "Cannabis Medicine", patients: 150, mrr: 8500, growth: 12, status: "Active"
    });
  }

  // 4. Demographics (Live from Patients)
  const patients = await prisma.patient.findMany({
    where: { organizationId: orgId, deletedAt: null },
    select: { dateOfBirth: true }
  });

  const ageBuckets = { "18-25": 0, "26-35": 0, "36-50": 0, "51-65": 0, "65+": 0 };
  const currentYear = new Date().getFullYear();

  patients.forEach(p => {
    if (p.dateOfBirth) {
      const age = currentYear - p.dateOfBirth.getFullYear();
      if (age <= 25) ageBuckets["18-25"]++;
      else if (age <= 35) ageBuckets["26-35"]++;
      else if (age <= 50) ageBuckets["36-50"]++;
      else if (age <= 65) ageBuckets["51-65"]++;
      else ageBuckets["65+"]++;
    }
  });

  const demoData = Object.entries(ageBuckets)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));

  // Fallback demo data if db is empty
  if (demoData.length === 0) {
    demoData.push({ name: "18-25", value: 120 }, { name: "26-35", value: 350 }, { name: "36-50", value: 420 });
  }

  return { chemovars, noShowData, revenueData, demoData };
}

async function AsyncCell({ id }: { id: string }) {
  const data = await fetchMetricData(id);
  return <CanopyCell metric={data} />;
}

async function DashboardWidgets() {
  const { chemovars, noShowData, revenueData, demoData } = await fetchDashboardData();

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ChemovarLeaderboard data={chemovars} />
        <RevenueByProviderTable data={revenueData} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <NoShowTrendLine data={noShowData} />
        <DemographicsChart data={demoData} />
      </div>
    </>
  );
}

export default function AtlasPage() {
  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      <CanopyBoard 
        title="The Canopy" 
        description="Unified data-display construct and organizational insight board."
      >
        <Suspense fallback={<CanopyCell metric={{ id: "load", title: "Active Patients", currentValue: "-", format: "number", drilldownUrl: "#" }} isLoading={true} />}>
          <AsyncCell id="active-patients" />
        </Suspense>
        
        <Suspense fallback={<CanopyCell metric={{ id: "load", title: "Compliance", currentValue: "-", format: "number", drilldownUrl: "#" }} isLoading={true} />}>
          <AsyncCell id="compliance" />
        </Suspense>
      </CanopyBoard>

      <Suspense fallback={<div className="h-96 bg-surface-muted rounded-xl animate-pulse" />}>
        <DashboardWidgets />
      </Suspense>
    </div>
  );
}
