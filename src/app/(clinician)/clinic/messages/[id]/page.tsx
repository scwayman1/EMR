import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageBubble, type BubbleMessage } from "@/components/messaging/MessageBubble";
import { ReplyForm } from "@/components/messaging/ReplyForm";
import { sendClinicianReplyAction } from "../actions";
import { formatRelative } from "@/lib/utils/format";

export const metadata = { title: "Thread" };

export default async function ClinicianThreadPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await requireUser();
  if (!user.organizationId) notFound();

  const thread = await prisma.messageThread.findFirst({
    where: {
      id: params.id,
      patient: { organizationId: user.organizationId },
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
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
        : `${thread.patient.firstName} ${thread.patient.lastName}`;
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

  const replyAction = sendClinicianReplyAction.bind(null, thread.id);

  return (
    <PageShell maxWidth="max-w-[900px]">
      <div className="mb-4">
        <Link
          href="/clinic/messages"
          className="text-xs text-text-muted hover:text-text"
        >
          &larr; Inbox
        </Link>
      </div>

      <PageHeader
        eyebrow={
          <>
            <Link
              href={`/clinic/patients/${thread.patient.id}`}
              className="text-accent hover:underline"
            >
              {thread.patient.firstName} {thread.patient.lastName}
            </Link>
            <span className="text-text-subtle">
              {" \u00b7 "}Last activity {formatRelative(thread.lastMessageAt)}
            </span>
          </>
        }
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
