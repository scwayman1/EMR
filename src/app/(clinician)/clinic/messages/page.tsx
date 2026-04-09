import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { ClinicMessagesView } from "./thread-view";

export const metadata = { title: "Messages" };

export default async function ClinicMessagesPage() {
  const user = await requireUser();
  const threads = await prisma.messageThread.findMany({
    where: { patient: { organizationId: user.organizationId! } },
    orderBy: { lastMessageAt: "desc" },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        include: {
          sender: {
            select: { firstName: true, lastName: true },
          },
        },
      },
    },
    take: 50,
  });

  // Serialize dates for client component
  const serialized = threads.map((t) => ({
    id: t.id,
    subject: t.subject,
    lastMessageAt: t.lastMessageAt.toISOString(),
    patient: {
      firstName: t.patient.firstName,
      lastName: t.patient.lastName,
    },
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
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Messages"
        title="Care team inbox"
        description="All active patient conversations, sorted by recency."
      />
      <ClinicMessagesView threads={serialized} currentUserId={user.id} />
    </PageShell>
  );
}
