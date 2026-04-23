import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { MarketingView, type ChannelStats } from "./marketing-view";

export const metadata = { title: "Marketing Attribution" };

const DEMO_CHANNELS: ChannelStats[] = [
  { channel: "Google", newPatients: 42, spend: 3200, visitors: 2100, demoRequests: 210, signups: 65 },
  { channel: "Referral", newPatients: 31, spend: 0,    visitors: 180,  demoRequests: 120, signups: 55 },
  { channel: "Social", newPatients: 18, spend: 1600, visitors: 1450, demoRequests: 120, signups: 28 },
  { channel: "Insurance directory", newPatients: 14, spend: 0,    visitors: 220,  demoRequests: 60,  signups: 22 },
  { channel: "Walk-in", newPatients: 9,  spend: 0,    visitors: 120,  demoRequests: 40,  signups: 12 },
  { channel: "Other", newPatients: 6,  spend: 200,  visitors: 80,   demoRequests: 22,  signups: 8  },
];

const MONTHLY_TREND: Array<{ month: string; value: number }> = [
  { month: "Nov", value: 82 },
  { month: "Dec", value: 91 },
  { month: "Jan", value: 102 },
  { month: "Feb", value: 108 },
  { month: "Mar", value: 115 },
  { month: "Apr", value: 120 },
];

export default async function MarketingPage() {
  await requireUser();

  const totalThisMonth = DEMO_CHANNELS.reduce((acc, c) => acc + c.newPatients, 0);
  const yoyPct = 32; // demo

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Team"
        title="Marketing attribution"
        description="How new patients are finding Leafjourney. Where to invest next month."
      />
      <MarketingView
        totalThisMonth={totalThisMonth}
        yoyPct={yoyPct}
        channels={DEMO_CHANNELS}
        monthlyTrend={MONTHLY_TREND}
      />
    </PageShell>
  );
}
