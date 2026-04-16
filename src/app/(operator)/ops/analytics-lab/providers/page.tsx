import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { LeaderboardView, type ProviderRow } from "./leaderboard-view";

export const metadata = { title: "Provider Leaderboard" };

function seedRows(): ProviderRow[] {
  return [
    {
      id: "prov-1",
      name: "Dr. Sarah Chen",
      specialty: "Pain Medicine",
      patientsThisMonth: 184,
      notesOnTimePct: 96,
      satisfactionNps: 78,
      revenue: 62_400,
      agentAcceptance: 84,
    },
    {
      id: "prov-2",
      name: "Dr. Marcus Rivera",
      specialty: "Integrative Medicine",
      patientsThisMonth: 142,
      notesOnTimePct: 92,
      satisfactionNps: 71,
      revenue: 48_900,
      agentAcceptance: 79,
    },
    {
      id: "prov-3",
      name: "Dr. Amara Okafor",
      specialty: "Psychiatry",
      patientsThisMonth: 198,
      notesOnTimePct: 88,
      satisfactionNps: 82,
      revenue: 71_200,
      agentAcceptance: 91,
    },
    {
      id: "prov-4",
      name: "Dr. Yuki Tanaka",
      specialty: "Family Medicine",
      patientsThisMonth: 161,
      notesOnTimePct: 98,
      satisfactionNps: 69,
      revenue: 54_100,
      agentAcceptance: 73,
    },
    {
      id: "prov-5",
      name: "Dr. Priya Shah",
      specialty: "Cannabis Medicine",
      patientsThisMonth: 215,
      notesOnTimePct: 94,
      satisfactionNps: 85,
      revenue: 79_800,
      agentAcceptance: 88,
    },
    {
      id: "prov-6",
      name: "Dr. Elena Vasquez",
      specialty: "Neurology",
      patientsThisMonth: 129,
      notesOnTimePct: 90,
      satisfactionNps: 74,
      revenue: 44_500,
      agentAcceptance: 81,
    },
    {
      id: "prov-7",
      name: "Dr. Thomas Bell",
      specialty: "Rheumatology",
      patientsThisMonth: 118,
      notesOnTimePct: 86,
      satisfactionNps: 66,
      revenue: 39_800,
      agentAcceptance: 70,
    },
  ];
}

export default async function ProviderLeaderboardPage() {
  await requireUser();
  const rows = seedRows();

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Analytics Lab"
        title="Provider Leaderboard"
        description="Compare clinical throughput, timeliness, patient satisfaction, revenue, and AI agent acceptance across your provider roster."
      />
      <LeaderboardView rows={rows} />
    </PageShell>
  );
}
