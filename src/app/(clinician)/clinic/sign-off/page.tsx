import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Sign-Off Queue" };

// EMR-165: Doctor Sign-Off Workflow for Patient Results
//
// One queue, four sources. Clinicians have to sign labs, refills,
// AI-drafted clinic notes, and outbound messages. Today each lives on
// its own page; this is the unified inbox so a doctor can clear the
// day's pending review in a single sweep, sorted by urgency. Each row
// deep-links to the existing review surface that owns the actual sign
// action — this page only aggregates and routes.

type Row = {
  id: string;
  kind: "lab" | "refill" | "note" | "message";
  title: string;
  patientName: string;
  patientId: string;
  receivedAt: Date;
  urgency: "high" | "normal" | "low";
  /** Description shown beneath the title — context for triage. */
  hint: string;
  /** Where clicking the row deep-links to. */
  href: string;
};

export default async function SignOffPage() {
  const user = await requireUser();
  const orgId = user.organizationId!;

  const [labs, refills, notes, messages] = await Promise.all([
    prisma.labResult.findMany({
      where: { organizationId: orgId, signedAt: null },
      orderBy: { receivedAt: "desc" },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
      take: 50,
    }),
    prisma.refillRequest.findMany({
      where: {
        organizationId: orgId,
        signedAt: null,
        status: { in: ["new", "flagged"] },
      },
      orderBy: { receivedAt: "desc" },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        medication: { select: { name: true, dosage: true } },
      },
      take: 50,
    }),
    prisma.note.findMany({
      where: {
        status: "needs_review",
        encounter: { patient: { organizationId: orgId } },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        encounter: {
          include: {
            patient: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      take: 50,
    }),
    prisma.message.findMany({
      where: {
        status: "draft",
        aiDrafted: true,
        thread: { patient: { organizationId: orgId } },
      },
      orderBy: { createdAt: "desc" },
      include: {
        thread: {
          include: {
            patient: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      take: 50,
    }),
  ]);

  const rows: Row[] = [
    ...labs.map<Row>((l) => ({
      id: `lab-${l.id}`,
      kind: "lab" as const,
      title: l.panelName,
      patientName: `${l.patient.firstName} ${l.patient.lastName}`,
      patientId: l.patient.id,
      receivedAt: l.receivedAt,
      urgency: l.abnormalFlag ? ("high" as const) : ("normal" as const),
      hint: l.abnormalFlag
        ? "Abnormal — review and route"
        : "Within reference range",
      href: `/clinic/labs-review`,
    })),
    ...refills.map<Row>((r) => ({
      id: `refill-${r.id}`,
      kind: "refill" as const,
      title: `${r.medication.name}${r.medication.dosage ? ` · ${r.medication.dosage}` : ""}`,
      patientName: `${r.patient.firstName} ${r.patient.lastName}`,
      patientId: r.patient.id,
      receivedAt: r.receivedAt,
      urgency:
        r.status === "flagged"
          ? "high"
          : r.copilotSuggestion === "review"
            ? "normal"
            : "low",
      hint: r.rationale ?? `Qty ${r.requestedQty} · ${r.pharmacyName}`,
      href: `/clinic/refills`,
    })),
    ...notes.map<Row>((n) => ({
      id: `note-${n.id}`,
      kind: "note" as const,
      title: "AI-drafted clinic note",
      patientName: `${n.encounter.patient.firstName} ${n.encounter.patient.lastName}`,
      patientId: n.encounter.patient.id,
      receivedAt: n.updatedAt,
      urgency:
        (n.aiConfidence ?? 1) < 0.6 ? ("high" as const) : ("normal" as const),
      hint:
        (n.aiConfidence ?? 1) < 0.6
          ? `Low confidence (${Math.round((n.aiConfidence ?? 0) * 100)}%) — verify before signing`
          : `Confidence ${Math.round((n.aiConfidence ?? 1) * 100)}%`,
      href: `/clinic/patients/${n.encounter.patient.id}/notes/${n.id}`,
    })),
    ...messages.map<Row>((m) => ({
      id: `msg-${m.id}`,
      kind: "message" as const,
      title: m.thread.subject,
      patientName: `${m.thread.patient.firstName} ${m.thread.patient.lastName}`,
      patientId: m.thread.patient.id,
      receivedAt: m.createdAt,
      urgency:
        m.thread.triageUrgency === "emergency"
          ? "high"
          : m.thread.triageUrgency === "high"
            ? "high"
            : "normal",
      hint: m.thread.triageSummary ?? "AI-drafted reply awaiting review",
      href: `/clinic/approvals`,
    })),
  ];

  // Sort: high urgency first, then by oldest within each band so things
  // don't sit forever.
  const urgRank = { high: 0, normal: 1, low: 2 };
  rows.sort((a, b) => {
    const u = urgRank[a.urgency] - urgRank[b.urgency];
    if (u !== 0) return u;
    return a.receivedAt.getTime() - b.receivedAt.getTime();
  });

  const total = rows.length;
  const highCount = rows.filter((r) => r.urgency === "high").length;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Provider"
        title="Sign-off queue"
        description="One unified queue for everything that needs a physician signature today — labs, refills, AI notes, and outbound messages, ranked by urgency."
        actions={
          total > 0 ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-text-subtle">
                {total} item{total === 1 ? "" : "s"} pending
              </span>
              {highCount > 0 && (
                <Badge tone="danger">{highCount} urgent</Badge>
              )}
            </div>
          ) : null
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Queue clear"
          description="Nothing waiting on a signature right now. Take a moment, then come back — the queue refreshes as items arrive."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <SignOffRow key={r.id} row={r} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function SignOffRow({ row }: { row: Row }) {
  const kindLabel: Record<Row["kind"], string> = {
    lab: "Lab",
    refill: "Refill",
    note: "Note",
    message: "Message",
  };
  const kindTone: Record<Row["kind"], string> = {
    lab: "bg-[color:var(--info-soft)] text-[color:var(--info)]",
    refill: "bg-success/10 text-success",
    note: "bg-highlight-soft text-[color:var(--highlight-hover)]",
    message: "bg-accent-soft text-accent",
  };

  return (
    <Link href={row.href} className="block">
      <Card className="hover:border-accent/50 transition-colors">
        <CardContent className="flex items-center gap-4 px-5 py-3.5">
          <span
            className={`inline-flex items-center justify-center text-[10px] font-medium uppercase tracking-wider rounded-md px-2 py-1 shrink-0 ${kindTone[row.kind]}`}
          >
            {kindLabel[row.kind]}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text truncate">
              {row.title}{" "}
              <span className="text-text-subtle font-normal">·</span>{" "}
              <span className="text-text-muted font-normal">{row.patientName}</span>
            </p>
            <p className="text-[12px] text-text-subtle mt-0.5 truncate">
              {row.hint}
            </p>
          </div>
          {row.urgency === "high" && (
            <span className="h-1.5 w-1.5 rounded-full bg-danger shrink-0" />
          )}
          <span className="text-[11px] text-text-subtle tabular-nums shrink-0">
            {formatRelative(row.receivedAt)}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

function formatRelative(d: Date): string {
  const now = Date.now();
  const ms = now - d.getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
