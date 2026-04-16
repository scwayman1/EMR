import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/utils/format";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireRole("patient");
  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    include: {
      messageThreads: {
        orderBy: { lastMessageAt: "desc" },
        include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
    },
  });

  const threads = patient?.messageThreads ?? [];

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PageHeader
        eyebrow="Messages"
        title="Secure messages with your care team"
        description="Everything here is private and kept as part of your record."
        actions={
          <Link href="/portal/messages/new">
            <Button>New message</Button>
          </Link>
        }
      />

      {threads.length === 0 ? (
        <EmptyState
          title="No messages yet"
          description="Start a conversation with your care team."
          action={
            <Link href="/portal/messages/new">
              <Button>New message</Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <CardContent className="pt-4">
            <ul className="divide-y divide-border -mx-6">
              {threads.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/portal/messages/${t.id}`}
                    className="block px-6 py-4 hover:bg-surface-muted transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-text">{t.subject}</p>
                      <p className="text-xs text-text-subtle">{formatRelative(t.lastMessageAt)}</p>
                    </div>
                    <p className="text-sm text-text-muted mt-1 line-clamp-2">
                      {t.messages[0]?.body ?? "\u2014"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
