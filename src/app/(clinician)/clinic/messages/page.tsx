import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import {
  triageThread,
  PRIORITY_CONFIG,
  CATEGORY_LABELS,
  type TriagedMessage,
  type MessagePriority,
  type MessageCategory,
} from "@/lib/domain/smart-inbox";
import { SmartInboxView } from "./smart-inbox";

export const metadata = { title: "Smart Inbox" };

export default async function ClinicMessagesPage({
  searchParams,
}: {
  searchParams?: { thread?: string };
}) {
  const user = await requireUser();

  const threads = await prisma.messageThread.findMany({
    where: { patient: { organizationId: user.organizationId! } },
    orderBy: { lastMessageAt: "desc" },
    include: {
      patient: {
        select: { id: true, userId: true, firstName: true, lastName: true },
      },
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

  // Triage each thread and build serialized data for the client component
  const triaged: TriagedMessage[] = threads.map((t) => {
    const messagesForTriage = t.messages.map((m) => ({
      body: m.body,
      senderUserId: m.senderUserId,
      senderAgent: m.senderAgent,
      createdAt: m.createdAt.toISOString(),
    }));

    const result = triageThread(messagesForTriage, t.patient.userId);

    const unreadCount = t.messages.filter(
      (m) => m.status !== "read" && m.senderUserId !== user.id && !m.senderAgent,
    ).length;

    // Build a short summary from the most recent patient message
    const latestPatientMsg = t.messages.find(
      (m) =>
        m.senderUserId === t.patient.userId ||
        (!m.senderUserId && !m.senderAgent),
    );
    const summary = latestPatientMsg
      ? latestPatientMsg.body.length > 120
        ? latestPatientMsg.body.slice(0, 120) + "..."
        : latestPatientMsg.body
      : t.subject;

    return {
      threadId: t.id,
      subject: t.subject,
      patientName: `${t.patient.firstName} ${t.patient.lastName}`,
      patientId: t.patient.id,
      lastMessageAt: t.lastMessageAt.toISOString(),
      messageCount: t.messages.length,
      unreadCount,
      priority: result.priority,
      category: result.category,
      summary,
      triageReason: result.triageReason,
      suggestedAction: result.suggestedAction,
      needsClinician: result.needsClinician,
    };
  });

  // Serialize full thread messages for the detail view
  const threadMessages = threads.map((t) => ({
    threadId: t.id,
    patientName: `${t.patient.firstName} ${t.patient.lastName}`,
    subject: t.subject,
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
    <PageShell maxWidth="max-w-[1400px]">
      <PageHeader
        eyebrow="Messages"
        title="Smart Inbox"
        description="AI-triaged message queue. Threads are prioritized so urgent patient needs surface first."
      />
      <SmartInboxView
        triaged={triaged}
        threadMessages={threadMessages}
        currentUserId={user.id}
        initialThreadId={searchParams?.thread}
      />
    </PageShell>
  );
}
