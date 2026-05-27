import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/ornament";
import { formatDate } from "@/lib/utils/format";
import { expirationStatus, type ExpirationAlert } from "@/lib/billing/prior-auth";
import type { PriorAuthStatus } from "@prisma/client";

export const metadata = { title: "Prior auth queue" };

const STATUS_TONE: Record<PriorAuthStatus, "success" | "warning" | "danger" | "neutral" | "accent"> = {
  draft: "neutral",
  submitted: "accent",
  approved: "success",
  denied: "danger",
  expired: "warning",
  withdrawn: "neutral",
};

const ALERT_LABEL: Record<ExpirationAlert, { label: string; tone: "success" | "warning" | "danger" }> = {
  ok: { label: "active", tone: "success" },
  expires_in_14d: { label: "expires in 14d", tone: "warning" },
  expires_in_7d: { label: "expires in 7d", tone: "warning" },
  expires_in_1d: { label: "expires tomorrow", tone: "danger" },
  expired: { label: "expired", tone: "danger" },
};

export default async function PriorAuthPage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;
  const now = new Date();

  const auths = await prisma.priorAuthorization.findMany({
    where: { organizationId },
    orderBy: [{ status: "asc" }, { expiresAt: "asc" }, { updatedAt: "desc" }],
    take: 200,
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const counts = {
    draft: auths.filter((a) => a.status === "draft").length,
    submitted: auths.filter((a) => a.status === "submitted").length,
    approved: auths.filter((a) => a.status === "approved").length,
    denied: auths.filter((a) => a.status === "denied").length,
    expiring: auths.filter((a) => {
      if (a.status !== "approved") return false;
      const ex = expirationStatus(a.expiresAt, now);
      return ex === "expires_in_14d" || ex === "expires_in_7d" || ex === "expires_in_1d";
    }).length,
  };

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Track 7 · Financial Ops"
        title="Prior authorization queue"
        description="Cannabis services need PA on most commercial payers. Claim construction blocks submission without a valid PA where required."
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Draft" value={String(counts.draft)} hint="not yet submitted" />
        <StatCard label="Submitted" value={String(counts.submitted)} tone="accent" hint="awaiting payer" />
        <StatCard label="Approved" value={String(counts.approved)} tone="success" />
        <StatCard label="Denied" value={String(counts.denied)} tone="danger" />
        <StatCard label="Expiring" value={String(counts.expiring)} tone="warning" hint="approval expiring ≤ 14d" />
      </div>

      <div className="mb-4">
        <Eyebrow>All open requests</Eyebrow>
      </div>

      {auths.length === 0 ? (
        <EmptyState
          title="No prior auths"
          description="When a claim with cannabis-coded services is constructed for a payer that requires PA, a draft request lands here."
        />
      ) : (
        <div className="space-y-2">
          {auths.map((a) => {
            const expiry = a.status === "approved" ? expirationStatus(a.expiresAt, now) : "ok";
            const expiryInfo = ALERT_LABEL[expiry];
            return (
              <Card key={a.id} tone="raised">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <Avatar firstName={a.patient.firstName} lastName={a.patient.lastName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Link href={`/clinic/patients/${a.patient.id}`} className="text-sm font-medium text-text hover:text-accent">
                          {a.patient.firstName} {a.patient.lastName}
                        </Link>
                        <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                        {a.status === "approved" && expiry !== "ok" && (
                          <Badge tone={expiryInfo.tone}>{expiryInfo.label}</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-text-subtle">
                        {a.payerName} · CPT: {a.cptCodes.join(", ") || "—"} · ICD-10: {a.icd10Codes.slice(0, 3).join(", ") || "—"}
                        {a.approvalNumber && ` · auth ${a.approvalNumber}`}
                        {a.expiresAt && ` · expires ${formatDate(a.expiresAt)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-text-subtle">
                        {a.submittedAt ? `submitted ${formatDate(a.submittedAt)}` : "not yet submitted"}
                      </p>
                      {a.approvedUnits != null && (
                        <p className="text-[11px] text-text">{a.approvedUnits}/{a.unitsRequested} units</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

function StatCard({ label, value, tone = "neutral", hint }: { label: string; value: string; tone?: "neutral" | "success" | "warning" | "danger" | "accent"; hint?: string }) {
  const colors: Record<string, string> = { neutral: "text-text", success: "text-success", warning: "text-[color:var(--warning)]", danger: "text-danger", accent: "text-accent" };
  return (
    <Card tone="raised">
      <CardContent className="pt-5 pb-5">
        <p className={`font-display text-2xl tabular-nums ${colors[tone]}`}>{value}</p>
        <p className="text-xs text-text-muted mt-1">{label}</p>
        {hint && <p className="text-[10px] text-text-subtle mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}
