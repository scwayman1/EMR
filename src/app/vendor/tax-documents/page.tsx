import { Download, Lock, Clock, FileText } from "lucide-react";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listTaxDocuments,
  demoVendorTaxProfile,
  type TaxDocKind,
  type TaxDocStatus,
} from "@/lib/marketplace/vendor-tax";
import {
  listPayrollTaxDocuments,
  demoVendorPayrollProfile,
  PAYROLL_DOC_LABELS,
  type PayrollDocKind,
} from "@/lib/store/vendor-payroll-tax";

const VENDOR_ID = "solace-botanicals";

const MARKETPLACE_LABELS: Record<TaxDocKind, string> = {
  "1099_k": "1099-K (marketplace earnings)",
  w9_on_file: "W-9 (taxpayer info on file)",
  annual_summary: "Annual earnings summary",
  monthly_settlement: "Monthly settlement statement",
};

const STATUS_META: Record<TaxDocStatus, { label: string; tone: React.ComponentProps<typeof Badge>["tone"] }> = {
  available: { label: "Available", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  ineligible: { label: "Not required", tone: "neutral" },
  missing_prerequisite: { label: "Action needed", tone: "danger" },
};

interface Row {
  id: string;
  label: string;
  period: string;
  status: TaxDocStatus;
  downloadable: boolean;
  hint?: string;
}

function DocTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <p className="text-[13px] text-text-subtle">No documents for this category yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13.5px]">
        <thead>
          <tr className="border-b border-border text-left text-[12px] uppercase tracking-wide text-text-subtle">
            <th className="py-2 pr-4 font-medium">Document</th>
            <th className="py-2 pr-4 font-medium">Period</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {rows.map((row) => {
            const meta = STATUS_META[row.status];
            return (
              <tr key={row.id}>
                <td className="py-3 pr-4">
                  <span className="flex items-center gap-2 text-text">
                    <FileText width={15} height={15} className="text-text-subtle" />
                    {row.label}
                  </span>
                  {row.hint && <p className="mt-0.5 pl-[23px] text-[11.5px] text-text-subtle">{row.hint}</p>}
                </td>
                <td className="py-3 pr-4 tabular-nums text-text-muted">{row.period}</td>
                <td className="py-3 pr-4">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </td>
                <td className="py-3 text-right">
                  {row.downloadable ? (
                    <Button size="sm" variant="secondary" leadingIcon={<Download width={14} height={14} />}>
                      Download
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[12px] text-text-subtle">
                      {row.status === "pending" ? <Clock width={13} height={13} /> : <Lock width={13} height={13} />}
                      Unavailable
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function VendorTaxDocumentsPage() {
  const marketplaceDocs = listTaxDocuments(demoVendorTaxProfile(VENDOR_ID));
  const payrollDocs = listPayrollTaxDocuments(demoVendorPayrollProfile(VENDOR_ID));

  const marketplaceRows: Row[] = marketplaceDocs.map((d) => ({
    id: d.id,
    label: MARKETPLACE_LABELS[d.kind],
    period: d.periodLabel ?? String(d.taxYear),
    status: d.status,
    downloadable: d.status === "available",
    hint: d.hint,
  }));

  const employeeRows: Row[] = payrollDocs
    .filter((d) => d.audience === "employee")
    .map((d) => ({
      id: d.id,
      label: `${PAYROLL_DOC_LABELS[d.kind as PayrollDocKind]}${d.documentCount > 1 ? ` · ${d.documentCount} employees` : ""}`,
      period: String(d.taxYear),
      status: d.status,
      downloadable: d.status === "available",
      hint: d.hint,
    }));

  const employerRows: Row[] = payrollDocs
    .filter((d) => d.audience === "employer")
    .map((d) => ({
      id: d.id,
      label: PAYROLL_DOC_LABELS[d.kind as PayrollDocKind],
      period: d.periodLabel ? `${d.taxYear} ${d.periodLabel}` : String(d.taxYear),
      status: d.status,
      downloadable: d.status === "available",
      hint: d.hint,
    }));

  return (
    <PageShell>
      <PageHeader
        eyebrow="Vendor tax center"
        title="Tax documents"
        description="Everything you need at tax time — marketplace 1099-K and settlement statements, plus W-2 / W-3 and quarterly 941s for your employees and your business."
      />

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>Marketplace earnings</CardTitle>
          <CardDescription>1099-K, your W-9 on file, and your annual earnings summary.</CardDescription>
        </CardHeader>
        <CardContent>
          <DocTable rows={marketplaceRows.filter((r) => !r.id.startsWith("monthly-"))} />
        </CardContent>
      </Card>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>Monthly settlement statements</CardTitle>
          <CardDescription>Per-month payout reconciliation for the trailing quarter.</CardDescription>
        </CardHeader>
        <CardContent>
          <DocTable rows={marketplaceRows.filter((r) => r.id.startsWith("monthly-"))} />
        </CardContent>
      </Card>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>Employee documents (W-2)</CardTitle>
          <CardDescription>Wage statements issued to the employees on your payroll.</CardDescription>
        </CardHeader>
        <CardContent>
          <DocTable rows={employeeRows} />
        </CardContent>
      </Card>

      <Card tone="raised">
        <CardHeader>
          <CardTitle>Employer filings (W-3 & 941)</CardTitle>
          <CardDescription>Your transmittal to the SSA and quarterly federal returns.</CardDescription>
        </CardHeader>
        <CardContent>
          <DocTable rows={employerRows} />
        </CardContent>
      </Card>

      <p className="mt-6 text-[12px] text-text-subtle">
        Documents are generated from your verified marketplace and payroll records. 1099-K, W-2, and
        W-3 forms publish on February 1 for the prior tax year. Questions? Contact vendor support.
      </p>
    </PageShell>
  );
}
