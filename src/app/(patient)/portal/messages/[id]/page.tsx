import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageBubble, type BubbleMessage } from "@/components/messaging/MessageBubble";
import { ReplyForm } from "@/components/messaging/ReplyForm";
import { sendPatientReplyAction } from "../actions";
import { formatRelative } from "@/lib/utils/format";

export const metadata = { title: "Thread" };

export default async function PatientThreadPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireRole("patient");

  const thread = await prisma.messageThread.findFirst({
    where: { id: params.id, patient: { userId: user.id } },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  if (!thread) notFound();

  const bubbles: BubbleMessage[] = thread.messages.map((m) => {
    const isMine = m.senderUserId === user.id;
    const authorLabel = m.senderAgent
      ? m.senderAgent
      : m.sender
        ? `${m.sender.firstName} ${m.sender.lastName}`
        : "Care team";
    return {
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      sentAt: m.sentAt,
      aiDrafted: m.aiDrafted,
      status: m.status,
      authorLabel: isMine ? "You" : authorLabel,
      isMine,
    };
  });

  const replyAction = sendPatientReplyAction.bind(null, thread.id);

  return (
    <PageShell maxWidth="max-w-[760px]">
      <div className="mb-4">
        <Link
          href="/portal/messages"
          className="text-xs text-text-muted hover:text-text"
        >
          &larr; All messages
        </Link>
      </div>

      <PageHeader
        eyebrow={`Last activity ${formatRelative(thread.lastMessageAt)}`}
        title={thread.subject}
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <ul className="space-y-6">
            {bubbles.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reply</CardTitle>
        </CardHeader>
        <CardContent>
          <ReplyForm action={replyAction} />
        </CardContent>
      </Card>
    </PageShell>
  );
}
