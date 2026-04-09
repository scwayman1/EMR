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

  // Serialize dates for client component
  const serialized = threads.map((t) => ({
    id: t.id,
    subject: t.subject,
    lastMessageAt: t.lastMessageAt.toISOString(),
    messages: t.messages.map((m) => ({
      id: m.id,
      body: m.body,
      status: m.status,
      aiDrafted: m.aiDrafted,
      senderUserId: m.senderUserId,
      senderAgent: m.senderAgent,
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
