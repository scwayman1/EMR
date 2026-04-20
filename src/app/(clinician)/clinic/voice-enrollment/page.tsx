import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { VoiceEnrollmentWizard } from "@/components/clinician/voice-enrollment-wizard";
import type { VoiceEnrollmentStatus } from "@/lib/domain/voice-enrollment";

export const metadata = {
  title: "Voice Enrollment",
  description:
    "Enroll your voice so future dictation can tell clinician and patient apart.",
};

/**
 * Discoverable only via direct URL for now. We deliberately do not
 * wire this into AppShell navigation — this is a stub and we don't
 * want clinicians to hit it until the diarization pipeline is live.
 */
export default async function VoiceEnrollmentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.organizationId) redirect("/");

  const existing = await prisma.voiceEnrollment.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: user.organizationId,
      },
    },
    select: { status: true },
  });

  const initialStatus: VoiceEnrollmentStatus | null = existing
    ? (existing.status as VoiceEnrollmentStatus)
    : null;

  const userName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <PageShell maxWidth="max-w-[720px]">
      <PageHeader
        eyebrow="Voice Enrollment"
        title="Teach the scribe your voice"
        description="A short sample lets future dictation separate your turns from the patient's. No audio leaves your organization."
      />
      <VoiceEnrollmentWizard
        userId={user.id}
        userName={userName || "there"}
        initialStatus={initialStatus}
      />
    </PageShell>
  );
}
