import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { PoliciesView, type Policy } from "./policies-view";

export const metadata = { title: "Policies & Procedures" };

const DEMO_POLICIES: Policy[] = [
  {
    id: "pol-hipaa-1",
    title: "Protected Health Information (PHI) Handling",
    category: "HIPAA",
    updatedAt: "2026-02-10",
    body: `All patient identifiers must be treated as PHI. Never share charts, messages, or screens over unsecured channels. Always verify identity before disclosing any information. Access only the charts you need to do your work.\n\nIf you observe a potential PHI disclosure, report it within 24 hours via the Incident Reporting tool.`,
  },
  {
    id: "pol-hipaa-2",
    title: "Minimum Necessary Rule",
    category: "HIPAA",
    updatedAt: "2026-01-20",
    body: `Only access the minimum patient information required for your role and task. Do not browse charts you are not assigned to. Audit logs are reviewed monthly.`,
  },
  {
    id: "pol-clin-1",
    title: "Cannabis Dose Initiation Protocol",
    category: "Clinical",
    updatedAt: "2026-03-02",
    body: `Start low and go slow. Begin with 2.5 mg THC (or 1:1 ratio) for cannabis-naive adults unless contraindicated. Re-evaluate in 7–14 days. Document starting dose, titration plan, and patient goals in the chart.`,
  },
  {
    id: "pol-clin-2",
    title: "Drug Interaction Screening",
    category: "Clinical",
    updatedAt: "2026-02-28",
    body: `Run the Drug Mix interaction checker on every cannabis certification. Special attention to: warfarin, clobazam, tacrolimus, and sedatives. Document interactions and patient counseling in the plan.`,
  },
  {
    id: "pol-safe-1",
    title: "Patient Fall Prevention",
    category: "Safety",
    updatedAt: "2026-03-15",
    body: `Patients on CNS-depressant dosing (high THC, sedating terpenes) should be advised not to drive for at least 6 hours. Offer ride-share credit if indicated. Screen elderly patients for orthostatic hypotension risk.`,
  },
  {
    id: "pol-ops-1",
    title: "Appointment Check-In & Verification",
    category: "Operations",
    updatedAt: "2026-03-22",
    body: `Verify patient identity using two data points (DOB + name or phone). Confirm insurance on file every 90 days. Scan consent forms at first visit and on any protocol change.`,
  },
  {
    id: "pol-ops-2",
    title: "After-Hours Voicemail",
    category: "Operations",
    updatedAt: "2026-01-05",
    body: `All after-hours voicemails must be reviewed by 8:30 AM on the next business day. Urgent messages (keywords: emergency, urgent, side effect) are escalated immediately to the on-call provider.`,
  },
  {
    id: "pol-em-1",
    title: "Medical Emergency Response",
    category: "Emergency",
    updatedAt: "2026-02-12",
    body: `If a patient in clinic loses consciousness, has trouble breathing, or reports severe chest pain: call 911, initiate AED/CPR per training, notify supervising provider, and document event within 1 hour.`,
  },
  {
    id: "pol-em-2",
    title: "Severe Adverse Event Escalation",
    category: "Emergency",
    updatedAt: "2026-03-01",
    body: `Any severe adverse event (hospitalization, seizure, psychosis) must be reported to the supervising provider within 1 hour. File an Incident Report with severity=critical and notify the MRO on call.`,
  },
  {
    id: "pol-hipaa-3",
    title: "Device Security & Screen Locking",
    category: "HIPAA",
    updatedAt: "2026-01-30",
    body: `Lock your workstation (Cmd/Ctrl+L) whenever you step away. Phones accessing the EMR require device passcodes. Report lost devices to IT within 2 hours.`,
  },
];

export default async function PoliciesPage() {
  await requireUser();

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Team"
        title="Policies & procedures"
        description="Reference, search, and acknowledge practice policies. Always work to the latest version."
      />
      <PoliciesView policies={DEMO_POLICIES} />
    </PageShell>
  );
}
