import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils/format";

export const metadata = { title: "Stored Payment Methods" };

export default async function PaymentMethodsPage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;

  const methods = await prisma.storedPaymentMethod.findMany({
    where: {
      active: true,
      patient: { organizationId },
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  const cardCount = methods.filter((m) => m.type === "card").length;
  const achCount = methods.filter((m) => m.type === "ach").length;
  const defaultCount = methods.filter((m) => m.isDefault).length;
  const uniquePatients = new Set(methods.map((m) => m.patientId)).size;

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Patient finance"
        title="Stored payment methods"
        description="Tokenized card + ACH on file across the practice. Tokens are processor-side (Payabli) — only last 4 + brand are stored locally."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active methods" value={String(methods.length)} size="md" />
        <StatCard label="Patients on file" value={String(uniquePatients)} size="md" />
        <StatCard label="Cards" value={String(cardCount)} tone="accent" size="md" />
        <StatCard label="ACH" value={String(achCount)} tone="info" size="md" />
      </div>

      {methods.length === 0 ? (
        <EmptyState
          title="No stored methods yet"
          description="Patients can save a card or bank account from the portal billing tab. Tokens are stored at Payabli — never PAN."
        />
      ) : (
        <Card tone="raised">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-3 px-5 font-medium text-text-subtle text-[10px] uppercase tracking-wider">Patient</th>
                    <th className="py-3 px-5 font-medium text-text-subtle text-[10px] uppercase tracking-wider">Type</th>
                    <th className="py-3 px-5 font-medium text-text-subtle text-[10px] uppercase tracking-wider">Brand</th>
                    <th className="py-3 px-5 font-medium text-text-subtle text-[10px] uppercase tracking-wider">Last 4</th>
                    <th className="py-3 px-5 font-medium text-text-subtle text-[10px] uppercase tracking-wider">Expires</th>
                    <th className="py-3 px-5 font-medium text-text-subtle text-[10px] uppercase tracking-wider">Saved</th>
                    <th className="py-3 px-5 font-medium text-text-subtle text-[10px] uppercase tracking-wider">Default</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {methods.map((m) => (
                    <tr key={m.id} className="hover:bg-surface-muted/40 transition-colors">
                      <td className="py-3 px-5">
                        <Link
                          href={`/clinic/patients/${m.patient.id}`}
                          className="flex items-center gap-2 group"
                        >
                          <Avatar
                            firstName={m.patient.firstName}
                            lastName={m.patient.lastName}
                            size="sm"
                          />
                          <span className="font-medium text-text group-hover:text-accent transition-colors">
                            {m.patient.firstName} {m.patient.lastName}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3 px-5">
                        <Badge tone={m.type === "card" ? "accent" : "info"}>
                          {m.type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-5 text-text">{m.brand ?? "—"}</td>
                      <td className="py-3 px-5 tabular-nums text-text">•••• {m.last4}</td>
                      <td className="py-3 px-5 tabular-nums text-text-muted">
                        {m.expiryMonth && m.expiryYear
                          ? `${String(m.expiryMonth).padStart(2, "0")}/${String(m.expiryYear).slice(-2)}`
                          : "—"}
                      </td>
                      <td className="py-3 px-5 text-text-muted">{formatDate(m.createdAt)}</td>
                      <td className="py-3 px-5">{m.isDefault ? <Badge tone="success">Default</Badge> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-text-subtle mt-6">
        {defaultCount} patient(s) have a default method set. Charges flow through{" "}
        <code className="bg-surface-muted px-1 py-0.5 rounded">chargeStoredMethod()</code> in{" "}
        <code className="bg-surface-muted px-1 py-0.5 rounded">src/lib/billing/payment-methods.ts</code>{" "}
        and book to the FinancialEvent ledger before the receipt is generated.
      </p>
    </PageShell>
  );
}
