// EMR-145 — Cannabis Dispensary Billing dashboard.
//
// Operators document each patient's monthly cannabis spend so the
// practice has a clean audit trail ready when the federal $500
// reimbursement program goes live. The page lists every recorded
// reimbursement row, its status, and the YTD running total per
// patient.

import { redirect } from "next/navigation";

import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow, LeafSprig } from "@/components/ui/ornament";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_CAP_CENTS } from "@/lib/dispensary";
import { ROLE_HOME } from "@/lib/rbac/roles";

export const metadata = { title: "Dispensary reimbursement" };

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusTone(status: string): "success" | "warning" | "accent" | "neutral" {
  switch (status) {
    case "paid":
    case "approved":
      return "success";
    case "submitted":
      return "accent";
    case "denied":
      return "warning";
    default:
      return "neutral";
  }
}

function monthLabel(d: Date): string {
  return d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function DispensaryReimbursementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (
    !user.roles.some((r) => r === "operator" || r === "practice_owner")
  ) {
    redirect(ROLE_HOME[user.roles[0]] ?? "/");
  }
  if (!user.organizationId) {
    return (
      <PageShell maxWidth="max-w-[960px]">
        <PageHeader title="Dispensary reimbursement" eyebrow="Billing" description="No practice selected." />
      </PageShell>
    );
  }

  const rows = await prisma.dispensaryReimbursement.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ serviceMonth: "desc" }, { createdAt: "desc" }],
    include: {
      dispensary: { select: { name: true } },
      patient: { select: { firstName: true, lastName: true } },
    },
  });

  const totalDocumented = rows.reduce((s, r) => s + r.documentedSpendCents, 0);
  const totalReimbursable = rows.reduce((s, r) => s + r.reimbursableCents, 0);
  const submittedCount = rows.filter((r) => r.status === "submitted" || r.status === "approved").length;

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Billing — Cannabis"
        title="Dispensary reimbursement"
        description="Monthly cannabis spend documentation per patient. Cap defaults to $500/year per patient. Federal reimbursement is not currently available; this is the audit-ready record set."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card tone="raised">
          <CardContent className="py-5">
            <Eyebrow>Documented spend</Eyebrow>
            <p className="font-display text-3xl mt-2 text-text">{dollars(totalDocumented)}</p>
            <p className="text-xs text-text-muted mt-1">Across all months on file.</p>
          </CardContent>
        </Card>
        <Card tone="raised">
          <CardContent className="py-5">
            <Eyebrow>Reimbursable (capped)</Eyebrow>
            <p className="font-display text-3xl mt-2 text-text">{dollars(totalReimbursable)}</p>
            <p className="text-xs text-text-muted mt-1">
              Cap: {dollars(DEFAULT_CAP_CENTS)} / patient / year.
            </p>
          </CardContent>
        </Card>
        <Card tone="raised">
          <CardContent className="py-5">
            <Eyebrow>Pending or approved</Eyebrow>
            <p className="font-display text-3xl mt-2 text-text">{submittedCount}</p>
            <p className="text-xs text-text-muted mt-1">
              Rows submitted to a payer or in review.
            </p>
          </CardContent>
        </Card>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<LeafSprig size={28} className="text-accent" />}
          title="No reimbursement records yet"
          description="When a patient documents cannabis spend, it shows up here. The annual cap ($500) is the maximum reimbursable per patient per calendar year."
        />
      ) : (
        <Card tone="raised">
          <CardHeader>
            <CardTitle className="text-base">Reimbursement records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-2 pr-4 font-medium text-text-subtle text-xs uppercase tracking-wide">
                      Patient
                    </th>
                    <th className="py-2 pr-4 font-medium text-text-subtle text-xs uppercase tracking-wide">
                      Dispensary
                    </th>
                    <th className="py-2 pr-4 font-medium text-text-subtle text-xs uppercase tracking-wide">
                      Service month
                    </th>
                    <th className="py-2 pr-4 font-medium text-text-subtle text-xs uppercase tracking-wide text-right">
                      Spend
                    </th>
                    <th className="py-2 pr-4 font-medium text-text-subtle text-xs uppercase tracking-wide text-right">
                      Reimbursable
                    </th>
                    <th className="py-2 font-medium text-text-subtle text-xs uppercase tracking-wide">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 pr-4 font-medium text-text">
                        {r.patient.firstName} {r.patient.lastName}
                      </td>
                      <td className="py-3 pr-4 text-text-muted">{r.dispensary.name}</td>
                      <td className="py-3 pr-4 text-text-muted">{monthLabel(r.serviceMonth)}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {dollars(r.documentedSpendCents)}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {dollars(r.reimbursableCents)}
                      </td>
                      <td className="py-3">
                        <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-[11px] text-text-subtle mt-6 max-w-2xl leading-relaxed">
        These records prepare the practice for the proposed federal $500/year
        cannabis reimbursement program. Until that goes live, rows here are
        an audit-ready paper trail — not a billable claim.
      </p>
    </PageShell>
  );
}
