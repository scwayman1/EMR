// EMR-033 — Provider-to-Provider Secure Portal (real DB-backed view).
//
// Replaces the prior demo. Threads are scoped to the caller's
// organization; bodies are decrypted on the server and shipped to the
// client component, which never sees ciphertext. A clinician can also
// start a brand-new thread from this page.

import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/ornament";
import { decryptMessageBodySafe } from "@/lib/communications/message-crypto";
import { ProviderInboxView, type DecryptedThread } from "./view";

export const metadata = { title: "Provider Messages" };

export default async function ProviderMessagesPage() {
  const user = await requireUser();
  const orgId = user.organizationId;

  if (!orgId) {
    return (
      <PageShell maxWidth="max-w-[1280px]">
        <div className="text-sm text-text-muted">
          No organization context — please contact your administrator.
        </div>
      </PageShell>
    );
  }

  // Threads where the current user is a participant.
  const threads = await prisma.providerMessageThread.findMany({
    where: {
      organizationId: orgId,
      participants: { some: { userId: user.id } },
    },
    orderBy: { lastMessageAt: "desc" },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      participants: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
    take: 50,
  });

  const decrypted: DecryptedThread[] = threads.map((t) => {
    const me = t.participants.find((p) => p.userId === user.id);
    const lastReadAt = me?.lastReadAt ?? null;
    const messages = t.messages.map((m) => ({
      id: m.id,
      senderUserId: m.senderUserId,
      senderName: `${m.sender.firstName} ${m.sender.lastName}`,
      body: decryptMessageBodySafe(m.bodyCipher),
      createdAt: m.createdAt.toISOString(),
    }));
    const unread = lastReadAt
      ? messages.filter(
          (m) =>
            m.senderUserId !== user.id && new Date(m.createdAt) > lastReadAt,
        ).length
      : messages.filter((m) => m.senderUserId !== user.id).length;
    return {
      id: t.id,
      subject: t.subject,
      lastMessageAt: t.lastMessageAt.toISOString(),
      patient: t.patient
        ? {
            id: t.patient.id,
            name: `${t.patient.firstName} ${t.patient.lastName}`,
          }
        : null,
      participants: t.participants
        .filter((p) => p.userId !== user.id)
        .map((p) => ({
          userId: p.userId,
          name: `${p.user.firstName} ${p.user.lastName}`,
        })),
      unreadCount: unread,
      messages,
    };
  });

  // Co-providers in same org for the "new thread" form.
  const providers = await prisma.provider.findMany({
    where: {
      organizationId: orgId,
      active: true,
      userId: { not: user.id },
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const recipientOptions = providers.map((p) => ({
    userId: p.user.id,
    name: `${p.user.firstName} ${p.user.lastName}`,
    title: p.title ?? null,
  }));

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Eyebrow className="mb-2">Secure provider channel</Eyebrow>
          <h1 className="font-display text-2xl text-text tracking-tight">
            Provider-to-Provider Messaging
          </h1>
          <p className="text-sm text-text-muted mt-1">
            HIPAA-compliant internal communication between providers about
            patient care. Messages are encrypted at rest.
          </p>
        </div>
        <Link href="/clinic/providers">
          <Button variant="secondary" size="sm">
            Provider directory
          </Button>
        </Link>
      </div>

      <ProviderInboxView
        threads={decrypted}
        currentUserId={user.id}
        recipientOptions={recipientOptions}
      />
    </PageShell>
  );
}
