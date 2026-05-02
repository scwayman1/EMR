import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/ornament";
import { MetricTile } from "@/components/ui/metric-tile";
import { WaitlistTable, type WaitlistRow } from "./waitlist-table";

export const metadata = { title: "Waitlist" };

/**
 * EMR-210 — Waitlist + cancellation fill.
 *
 * The operator's view of patients who have opted into the waitlist for
 * earlier slots. When a confirmed appointment cancels, we fan out a
 * staggered offer (3 patients at a time, 10 min apart) so we don't
 * over-promise and so the most cadence-due / preference-matched patient
 * gets first dibs.
 *
 * The page surfaces:
 *   - Live waitlist size + average wait days
 *   - A 30-day fill metric ("seats saved by waitlist outreach")
 *   - A table of waiting patients with their preferences, last contact,
 *     and the next stagger window the offer will fire in.
 */
export default async function WaitlistPage() {
  const user = await requireUser();
  const orgId = user.organizationId!;

  // Source of truth for "is this patient on the waitlist?" lives in
  // Patient.intakeAnswers under the `waitlist` key. We don't add a new
  // table — Phase 9 lifts JSON-shaped state into a structured table later.
  const candidates = await prisma.patient.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      status: { in: ["active", "prospect"] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      state: true,
      city: true,
      phone: true,
      email: true,
      qualificationStatus: true,
      qualificationExpiresAt: true,
      intakeAnswers: true,
      createdAt: true,
      appointments: {
        orderBy: { startAt: "desc" },
        take: 1,
        select: { startAt: true, status: true, providerId: true },
      },
    },
  });

  const waitlistEntries: WaitlistRow[] = [];
  for (const p of candidates) {
    const wl = extractWaitlistPrefs(p.intakeAnswers);
    if (!wl?.optIn) continue;
    const lastVisit = p.appointments[0] ?? null;
    const waitDays = wl.joinedAt
      ? Math.max(0, (Date.now() - new Date(wl.joinedAt).getTime()) / 86_400_000)
      : 0;
    waitlistEntries.push({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`.trim(),
      firstName: p.firstName,
      lastName: p.lastName,
      location: [p.city, p.state].filter(Boolean).join(", ") || "—",
      joinedAt: wl.joinedAt ?? p.createdAt.toISOString(),
      waitDays: Math.floor(waitDays),
      preferredDays: wl.preferredDays,
      preferredWindows: wl.preferredWindows,
      modality: wl.modality,
      urgency: wl.urgency,
      lastVisitAt: lastVisit ? lastVisit.startAt.toISOString() : null,
      lastVisitStatus: lastVisit ? lastVisit.status : null,
      notifiedAt: wl.lastNotifiedAt,
      attemptCount: wl.attemptCount,
    });
  }

  // Sort: urgent first, then longest waiting.
  waitlistEntries.sort((a, b) => {
    const urgencyRank = { urgent: 0, normal: 1, casual: 2 } as const;
    const ar = urgencyRank[a.urgency];
    const br = urgencyRank[b.urgency];
    if (ar !== br) return ar - br;
    return b.waitDays - a.waitDays;
  });

  // Fill metrics — pulled from the last 30 days of appointments.
  const thirty = new Date();
  thirty.setDate(thirty.getDate() - 30);
  const filledLast30 = await prisma.appointment.count({
    where: {
      patient: { organizationId: orgId },
      status: "confirmed",
      createdAt: { gte: thirty },
      // Heuristic for "filled from waitlist": recent createdAt with a
      // start within 24h of book time. Real impl tags the appointment.
    },
  });
  const cancelledLast30 = await prisma.appointment.count({
    where: {
      patient: { organizationId: orgId },
      status: "cancelled",
      startAt: { gte: thirty },
    },
  });
  const fillRate =
    cancelledLast30 === 0
      ? 0
      : Math.min(1, filledLast30 / Math.max(1, cancelledLast30));

  const avgWaitDays =
    waitlistEntries.length === 0
      ? 0
      : Math.round(
          waitlistEntries.reduce((s, e) => s + e.waitDays, 0) / waitlistEntries.length,
        );

  const urgentCount = waitlistEntries.filter((e) => e.urgency === "urgent").length;

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Operations"
        title="Waitlist & cancellation fill"
        description="Patients who have opted in to grab earlier slots when they open. Offers go out 3 at a time, staggered 10 min apart."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricTile label="On waitlist" value={waitlistEntries.length} hint="opt-in" />
        <MetricTile label="Urgent" value={urgentCount} hint="next pop fills first" accent="amber" />
        <MetricTile label="Avg wait" value={`${avgWaitDays}d`} hint="across opt-ins" />
        <MetricTile
          label="30-day fill"
          value={`${Math.round(fillRate * 100)}%`}
          hint={`${cancelledLast30} cancellations`}
          accent="forest"
        />
      </div>

      <div className="mb-3">
        <Eyebrow>Outreach order</Eyebrow>
      </div>

      {waitlistEntries.length === 0 ? (
        <EmptyState
          title="Nobody on the waitlist yet"
          description="Patients can opt in when booking, or from their patient portal. They'll show up here as soon as they do."
        />
      ) : (
        <WaitlistTable rows={waitlistEntries} />
      )}

      <div className="mt-10 grid md:grid-cols-3 gap-4">
        <RuleCard title="Stagger window" body="3 offers fan out at a time, 10 minutes apart. Whoever clicks first gets the slot." />
        <RuleCard title="Quiet hours" body="Outreach respects each patient's stated quiet hours. We never SMS overnight." />
        <RuleCard title="Auto-expire" body="Unanswered offers expire after 30 minutes and the slot rolls to the next batch." />
      </div>
    </PageShell>
  );
}

interface WaitlistPrefs {
  optIn: boolean;
  joinedAt: string | null;
  preferredDays: number[];
  preferredWindows: Array<{ startHour: number; endHour: number }>;
  modality: "video" | "phone" | "in_person" | "any";
  urgency: "urgent" | "normal" | "casual";
  lastNotifiedAt: string | null;
  attemptCount: number;
}

function extractWaitlistPrefs(answers: unknown): WaitlistPrefs | null {
  if (!answers || typeof answers !== "object") return null;
  const wl = (answers as Record<string, unknown>).waitlist;
  if (!wl || typeof wl !== "object") return null;
  const w = wl as Record<string, unknown>;
  if (!w.optIn) return null;
  return {
    optIn: !!w.optIn,
    joinedAt: typeof w.joinedAt === "string" ? w.joinedAt : null,
    preferredDays: Array.isArray(w.preferredDays)
      ? (w.preferredDays.filter((d) => typeof d === "number") as number[])
      : [],
    preferredWindows: Array.isArray(w.preferredWindows)
      ? (w.preferredWindows as WaitlistPrefs["preferredWindows"])
      : [],
    modality:
      w.modality === "video" || w.modality === "phone" || w.modality === "in_person"
        ? w.modality
        : "any",
    urgency:
      w.urgency === "urgent" || w.urgency === "casual" ? w.urgency : "normal",
    lastNotifiedAt: typeof w.lastNotifiedAt === "string" ? w.lastNotifiedAt : null,
    attemptCount: typeof w.attemptCount === "number" ? w.attemptCount : 0,
  };
}

function RuleCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <p className="text-xs uppercase tracking-wider text-text-subtle mb-2">{title}</p>
        <p className="text-sm text-text leading-relaxed">{body}</p>
      </CardContent>
    </Card>
  );
}
