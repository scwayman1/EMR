// EMR-315 — Vendor self-service tax documents page.
//
// Lists the documents the vendor can download (W-9 echo, 1099-K, annual
// summary, monthly settlements). Render-time the page hydrates the
// vendor's tax profile from the demo helper; the real impl swaps in a
// DB-backed lookup once VendorPayout aggregations land.

import Link from "next/link";
import {
  listTaxDocuments,
  demoVendorTaxProfile,
  type VendorTaxDocument,
} from "@/lib/marketplace/vendor-tax";

export const metadata = { title: "Tax documents" };

const KIND_LABEL: Record<VendorTaxDocument["kind"], string> = {
  "1099_k": "1099-K",
  w9_on_file: "W-9 on file",
  annual_summary: "Annual summary",
  monthly_settlement: "Monthly settlement",
};

const STATUS_TONE: Record<VendorTaxDocument["status"], string> = {
  available: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  ineligible: "bg-stone-100 text-stone-700",
  missing_prerequisite: "bg-rose-100 text-rose-800",
};

const STATUS_LABEL: Record<VendorTaxDocument["status"], string> = {
  available: "Available",
  pending: "Pending",
  ineligible: "Ineligible",
  missing_prerequisite: "Action required",
};

export default async function VendorTaxDocumentsPage() {
  // The vendor id comes from the vendor portal session; demo for now.
  const profile = demoVendorTaxProfile("demo-vendor");
  const docs = listTaxDocuments(profile);

  const grouped = {
    annual: docs.filter(
      (d) => d.kind === "1099_k" || d.kind === "w9_on_file" || d.kind === "annual_summary",
    ),
    monthly: docs.filter((d) => d.kind === "monthly_settlement"),
  };

  return (
    <main className="px-6 lg:px-12 py-10 max-w-[1200px] mx-auto">
      <header className="mb-8">
        <p className="eyebrow text-[var(--leaf)] mb-2">Vendor portal</p>
        <h1 className="font-display text-3xl tracking-tight text-[var(--ink)]">
          Tax documents
        </h1>
        <p className="text-[var(--text-soft)] mt-2 max-w-2xl">
          Download your annual tax forms, monthly settlement reports, and the
          W-9 we have on file. Documents become available once the relevant
          period closes.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="font-display text-lg text-[var(--ink)] mb-4">
          Annual & onboarding
        </h2>
        <DocTable docs={grouped.annual} />
      </section>

      <section>
        <h2 className="font-display text-lg text-[var(--ink)] mb-4">
          Monthly settlement statements
        </h2>
        <DocTable docs={grouped.monthly} />
      </section>

      <p className="text-[12px] text-[var(--muted)] mt-10">
        Need a correction? Email{" "}
        <Link href="mailto:vendors@leafjourney.com" className="text-[var(--leaf)] hover:underline">
          vendors@leafjourney.com
        </Link>{" "}
        within 30 days of issuance.
      </p>
    </main>
  );
}

function DocTable({ docs }: { docs: VendorTaxDocument[] }) {
  if (docs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-[13px] text-[var(--muted)]">
        Nothing here yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="bg-[var(--surface-muted)] text-left text-[11.5px] uppercase text-[var(--muted)]">
            <th className="py-3 px-4 font-medium">Document</th>
            <th className="py-3 px-4 font-medium">Period</th>
            <th className="py-3 px-4 font-medium">Status</th>
            <th className="py-3 px-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {docs.map((d) => (
            <tr key={d.id}>
              <td className="py-3 px-4 font-medium text-[var(--ink)]">
                {KIND_LABEL[d.kind]}
                {d.hint && (
                  <p className="text-[12px] text-[var(--muted)] mt-1 font-normal">
                    {d.hint}
                  </p>
                )}
              </td>
              <td className="py-3 px-4 text-[var(--text)]">
                {d.periodLabel ?? d.taxYear}
              </td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-[11.5px] font-medium ${STATUS_TONE[d.status]}`}
                >
                  {STATUS_LABEL[d.status]}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                {d.status === "available" && d.storageKey ? (
                  <a
                    href={`/api/vendor-portal/tax-documents/${encodeURIComponent(d.id)}`}
                    className="text-[13px] text-[var(--leaf)] font-medium hover:underline"
                  >
                    Download
                  </a>
                ) : d.status === "pending" && d.availableAt ? (
                  <span className="text-[12px] text-[var(--muted)]">
                    Available {d.availableAt.slice(0, 10)}
                  </span>
                ) : (
                  <span className="text-[12px] text-[var(--muted)]">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
