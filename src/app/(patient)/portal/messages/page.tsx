import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { PatientMessagesView } from "./thread-view";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireRole("patient");
  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    include: {
      messageThreads: {
        orderBy: { lastMessageAt: "desc" },
        include: {
          messages: {
            // HIPAA / Art. V §2: patients must NEVER see unapproved agent
            // drafts. Only messages the clinician has actively sent (or the
            // patient has sent themselves) may cross this boundary. Filtering
            // server-side means draft bodies never even reach the browser.
            where: { status: { in: ["sent", "read"] } },
            orderBy: { createdAt: "desc" },
            include: {
              sender: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
      },
    },
  });

  const threads = patient?.messageThreads ?? [];

  // Serialize dates for client component. Note we do NOT serialize the
  // `aiDrafted` or `senderAgent` fields — the patient has no business
  // knowing which of their care team's replies were drafted by AI.
  // The physician reviewed and approved every reply they see here.
  const serialized = threads.map((t) => ({
    id: t.id,
    subject: t.subject,
    lastMessageAt: t.lastMessageAt.toISOString(),
    messages: t.messages.map((m) => ({
      id: m.id,
      body: m.body,
      status: m.status,
      senderUserId: m.senderUserId,
      sender: m.sender
        ? { firstName: m.sender.firstName, lastName: m.sender.lastName }
        : null,
      createdAt: m.createdAt.toISOString(),
    })),
  }));

  return (
    <PageShell maxWidth="max-w-[1100px]">
      <PageHeader
        eyebrow="Messages"
        title="Secure messages with your care team"
        description="Everything here is private and kept as part of your record."
      />
      <PatientMessagesView threads={serialized} currentUserId={user.id} />
    </PageShell>
  );
}
