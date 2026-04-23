import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { ReportView } from "./report-view";

export const metadata = { title: "Daily Production Report" };

// ---------------------------------------------------------------------------
// Daily production report — summary of clinic activity for a given date
// ---------------------------------------------------------------------------

export interface DemoProvider {
  id: string;
  name: string;
  visits: number;
  notesSigned: number;
  revenueCents: number;
  avgVisitMinutes: number;
}

export interface DemoAgent {
  id: string;
  name: string;
  jobsRun: number;
  successRate: number;
}

export interface DemoAppointment {
  id: string;
  time: string;
  patient: string;
  provider: string;
  status: "completed" | "no_show" | "cancelled" | "in_progress";
  modality: "telehealth" | "in_person";
}

export interface DailyReportData {
  visitsCompleted: number;
  notesSigned: number;
  newPatients: number;
  revenueCents: number;
  activeAgents: number;
  providers: DemoProvider[];
  topAgents: DemoAgent[];
  appointments: DemoAppointment[];
  revenueBreakdown: { cashCents: number; cardCents: number; insuranceCents: number };
}

function buildDemoData(): DailyReportData {
  const providers: DemoProvider[] = [
    { id: "p1", name: "Dr. Sarah Chen", visits: 9, notesSigned: 9, revenueCents: 148500, avgVisitMinutes: 28 },
    { id: "p2", name: "Dr. Marcus Rivera", visits: 7, notesSigned: 6, revenueCents: 115500, avgVisitMinutes: 32 },
    { id: "p3", name: "Dr. Amara Okafor", visits: 6, notesSigned: 6, revenueCents:  99000, avgVisitMinutes: 25 },
    { id: "p4", name: "NP Jordan Lee", visits: 4, notesSigned: 3, revenueCents:  52800, avgVisitMinutes: 22 },
  ];
  const topAgents: DemoAgent[] = [
    { id: "a1", name: "Intake Summarizer", jobsRun: 14, successRate: 0.93 },
    { id: "a2", name: "Note Drafter", jobsRun: 22, successRate: 0.88 },
    { id: "a3", name: "Eligibility Checker", jobsRun: 18, successRate: 0.97 },
    { id: "a4", name: "Refill Triage", jobsRun: 11, successRate: 0.91 },
    { id: "a5", name: "Lab Explainer", jobsRun: 8, successRate: 0.95 },
  ];
  const appointments: DemoAppointment[] = [
    { id: "ap1", time: "08:30", patient: "Maya Patel",        provider: "Dr. Sarah Chen",     status: "completed",   modality: "telehealth" },
    { id: "ap2", time: "09:00", patient: "Trevor Owens",      provider: "Dr. Sarah Chen",     status: "completed",   modality: "in_person" },
    { id: "ap3", time: "09:30", patient: "Linh Nguyen",       provider: "Dr. Marcus Rivera",  status: "no_show",     modality: "telehealth" },
    { id: "ap4", time: "10:00", patient: "Devon Bishop",      provider: "Dr. Amara Okafor",   status: "completed",   modality: "in_person" },
    { id: "ap5", time: "10:30", patient: "Priya Shah",        provider: "Dr. Sarah Chen",     status: "completed",   modality: "telehealth" },
    { id: "ap6", time: "11:00", patient: "Carlos Ruiz",       provider: "NP Jordan Lee",      status: "completed",   modality: "in_person" },
    { id: "ap7", time: "13:00", patient: "Ada Robinson",      provider: "Dr. Marcus Rivera",  status: "in_progress", modality: "telehealth" },
    { id: "ap8", time: "13:30", patient: "Hank Whitfield",    provider: "Dr. Amara Okafor",   status: "completed",   modality: "in_person" },
    { id: "ap9", time: "14:00", patient: "Rebecca Hu",        provider: "Dr. Sarah Chen",     status: "cancelled",   modality: "telehealth" },
    { id: "ap10", time: "14:30", patient: "Jonah Klein",      provider: "Dr. Marcus Rivera",  status: "completed",   modality: "in_person" },
  ];
  const revenueCents = providers.reduce((sum, p) => sum + p.revenueCents, 0);

  return {
    visitsCompleted: providers.reduce((s, p) => s + p.visits, 0),
    notesSigned: providers.reduce((s, p) => s + p.notesSigned, 0),
    newPatients: 4,
    revenueCents,
    activeAgents: topAgents.length,
    providers,
    topAgents,
    appointments,
    revenueBreakdown: {
      cashCents: Math.round(revenueCents * 0.18),
      cardCents: Math.round(revenueCents * 0.52),
      insuranceCents: Math.round(revenueCents * 0.30),
    },
  };
}

export default async function DailyReportPage() {
  await requireUser();
  const data = buildDemoData();

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Operations"
        title="Daily Production Report"
        description="A printable end-of-day snapshot of visits, revenue, and agent activity."
      />
      <ReportView data={data} />
    </PageShell>
  );
}
