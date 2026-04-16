import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative } from "@/lib/utils/format";

export const metadata = { title: "Messages" };

export default async function ClinicMessagesPage() {
  const user = await requireUser();
  const threads = await prisma.messageThread.findMany({
    where: { patient: { organizationId: user.organizationId! } },
    orderBy: { lastMessageAt: "desc" },
    include: {
      patient: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    take: 30,
  });

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Messages"
        title="Care team inbox"
        description="All active patient conversations, sorted by recency."
      />
      {threads.length === 0 ? (
        <EmptyState title="No conversations yet" />
      ) : (
        <Card>
          <CardContent className="pt-4">
            <ul className="divide-y divide-border -mx-6">
              {threads.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/clinic/messages/${t.id}`}
                    className="block px-6 py-4 hover:bg-surface-muted transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-text">
                        {t.patient.firstName} {t.patient.lastName} &middot; {t.subject}
                      </p>
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
