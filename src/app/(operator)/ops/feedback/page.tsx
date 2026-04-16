import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { FeedbackView, type FeedbackItem } from "./feedback-view";

export const metadata = { title: "Patient Feedback" };

const DEMO_FEEDBACK: FeedbackItem[] = [
  {
    id: "fb-1",
    patientName: "Anonymous",
    rating: 4,
    excerpt: "My provider really listens. The new patient portal is clean and easy.",
    submittedAt: "2026-04-15T13:10:00Z",
    status: "new",
  },
  {
    id: "fb-2",
    patientName: "J. Thompson",
    rating: 10,
    excerpt: "Life-changing. The dosing plan for my anxiety actually works. Five stars.",
    submittedAt: "2026-04-14T09:22:00Z",
    status: "new",
  },
  {
    id: "fb-3",
    patientName: "Anonymous",
    rating: 3,
    excerpt: "Waited 35 minutes past my appointment time with no update. Felt rushed once I was seen.",
    submittedAt: "2026-04-13T16:45:00Z",
    status: "new",
  },
  {
    id: "fb-4",
    patientName: "M. Rivera",
    rating: 9,
    excerpt: "The check-in emoji survey is adorable and I actually do it every week.",
    submittedAt: "2026-04-12T10:00:00Z",
    status: "in_progress",
  },
  {
    id: "fb-5",
    patientName: "Anonymous",
    rating: 5,
    excerpt: "Billing was confusing. I got a statement I didn't understand.",
    submittedAt: "2026-04-11T14:30:00Z",
    status: "in_progress",
  },
  {
    id: "fb-6",
    patientName: "D. Patel",
    rating: 8,
    excerpt: "Great telehealth visit. Only ding: couldn't see my med list after the call.",
    submittedAt: "2026-04-09T11:50:00Z",
    status: "resolved",
  },
  {
    id: "fb-7",
    patientName: "Anonymous",
    rating: 2,
    excerpt: "Felt the provider was too rushed. My concerns weren't addressed.",
    submittedAt: "2026-04-06T09:05:00Z",
    status: "new",
  },
  {
    id: "fb-8",
    patientName: "L. Okafor",
    rating: 10,
    excerpt: "I tell everyone about Leafjourney. Keep doing what you're doing.",
    submittedAt: "2026-04-03T12:15:00Z",
    status: "resolved",
  },
];

export default async function FeedbackPage() {
  await requireUser();

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Team"
        title="Patient feedback"
        description="Triage, respond to, and learn from patient feedback. Lower NPS scores are surfaced first."
      />
      <FeedbackView initialFeedback={DEMO_FEEDBACK} />
    </PageShell>
  );
}
