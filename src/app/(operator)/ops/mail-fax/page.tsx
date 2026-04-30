import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  crossCheckCoverage,
  summarizeCrossCheck,
  type CoverageOnFile,
  type CrossCheckResult,
  type DocumentSource,
  type DocumentType,
} from "@/lib/billing/mail-fax-ocr";

export const metadata = { title: "Mail / Fax OCR Inbox" };

interface ScanRow {
  id: string;
  receivedAt: string;
  source: DocumentSource;
  patientName: string;
  patientMrn: string;
  rawOcr: string;
  coverages: CoverageOnFile[];
}

// Preview deck — wires to a real Prisma `InboundDocument` model in a
// follow-up. The structure here exercises every cross-check branch
// (exact match, new coverage, mismatch, low-confidence) so the UI
// shape is locked in before the persistence layer is added.
const PREVIEW_SCANS: ScanRow[] = [
  {
    id: "scan-001",
    receivedAt: "2026-04-29T08:14:00Z",
    source: "fax",
    patientName: "Maya Castillo",
    patientMrn: "MRN-A0042",
    rawOcr:
      "AETNA HEALTHCARE\nMember ID: W123456789\nGroup #: 0042-ABC\nPlan Type: PPO\nEffective: 01/01/2026\nSubscriber: Maya Castillo\nRxBIN: 610502  RxPCN: ADV",
    coverages: [
      {
        payerName: "Aetna",
        memberId: "W123456789",
        groupNumber: "0042-ABC",
      },
    ],
  },
  {
    id: "scan-002",
    receivedAt: "2026-04-29T07:58:00Z",
    source: "mail",
    patientName: "Jonas Reiter",
    patientMrn: "MRN-B0119",
    rawOcr:
      "BLUE CROSS BLUE SHIELD OF NEW YORK\nExplanation of Benefits\nMember ID: XJZ-44210-22\nGroup Number: NY-ENT-118\nPlan Type: HMO\nEffective Date: 2026-02-15",
    coverages: [
      {
        payerName: "Blue Cross Blue Shield",
        memberId: "XJZ-44210-21",
        groupNumber: "NY-ENT-118",
      },
    ],
  },
  {
    id: "scan-003",
    receivedAt: "2026-04-29T06:32:00Z",
    source: "fax",
    patientName: "Carla Wei",
    patientMrn: "MRN-C0207",
    rawOcr:
      "UNITED HEALTHCARE\nINSURANCE CARD\nMember #: UHC-77891234\nGroup: GRP-44-OPT\nHDHP Plan",
    coverages: [],
  },
  {
    id: "scan-004",
    receivedAt: "2026-04-29T05:11:00Z",
    source: "portal-upload",
    patientName: "Dion Kelly",
    patientMrn: "MRN-D0301",
    rawOcr:
      "Generic letter — patient name only, no payer or member id visible after OCR.",
    coverages: [
      {
        payerName: "Cigna",
        memberId: "C-201-330-9912",
        groupNumber: null,
      },
    ],
  },
];

const SOURCE_LABEL: Record<DocumentSource, string> = {
  mail: "Mail",
  fax: "Fax",
  "portal-upload": "Portal upload",
};

const DOC_TYPE_LABEL: Record<DocumentType, string> = {
  "insurance-card": "Insurance card",
  eob: "EOB",
  "denial-letter": "Denial letter",
  "auth-approval": "PA approval",
  unknown: "Unknown",
};

function tonForResult(result: CrossCheckResult) {
  if (result.isExactMatch) return "success" as const;
  if (result.mismatches.length > 0) return "danger" as const;
  if (result.isNewCoverage) return "warning" as const;
  return "neutral" as const;
}

function tonForConfidence(confidence: CrossCheckResult["confidence"]) {
  return confidence === "high"
    ? ("success" as const)
    : confidence === "medium"
      ? ("warning" as const)
      : ("danger" as const);
}

export default function MailFaxPage() {
  const reviewed = PREVIEW_SCANS.map((scan) => ({
    ...scan,
    result: crossCheckCoverage(scan.rawOcr, scan.coverages),
  }));

  const total = reviewed.length;
  const flagged = reviewed.filter(
    (r) => r.result.mismatches.length > 0 || r.result.isNewCoverage
  ).length;
  const lowConfidence = reviewed.filter(
    (r) => r.result.confidence === "low"
  ).length;
  const exactMatches = reviewed.filter((r) => r.result.isExactMatch).length;

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Patient operations"
        title="Mail & fax OCR inbox"
        description="Inbound mail packets, faxes, and portal uploads are OCR'd, parsed for payer / member / group, and cross-checked against the patient's coverage on file. Mismatches surface here before they cause denied claims."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Scans today" value={String(total)} size="md" />
        <StatCard
          label="Flagged for review"
          value={String(flagged)}
          hint="Mismatch or new coverage"
          tone={flagged > 0 ? "warning" : "neutral"}
          size="md"
        />
        <StatCard
          label="Exact matches"
          value={String(exactMatches)}
          hint="Auto-clear ready"
          size="md"
        />
        <StatCard
          label="Low confidence"
          value={String(lowConfidence)}
          hint="Needs human read"
          size="md"
        />
      </div>

      {reviewed.length === 0 ? (
        <EmptyState
          title="No inbound documents"
          description="When a fax arrives or a patient uploads a card from the portal, it lands here automatically."
        />
      ) : (
        <div className="space-y-3">
          {reviewed.map((scan) => (
            <ScanRowCard key={scan.id} scan={scan} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function ScanRowCard({
  scan,
}: {
  scan: ScanRow & { result: CrossCheckResult };
}) {
  const { result } = scan;
  return (
    <Card tone="raised">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              {scan.patientName}
              <Badge tone="neutral">{scan.patientMrn}</Badge>
            </CardTitle>
            <CardDescription>
              {SOURCE_LABEL[scan.source]} ·{" "}
              {DOC_TYPE_LABEL[result.documentType]} · received{" "}
              {new Date(scan.receivedAt).toLocaleString()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={tonForConfidence(result.confidence)}>
              {result.confidence} confidence
            </Badge>
            <Badge tone={tonForResult(result)}>
              {summarizeCrossCheck(result)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-surface-muted p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-2">
              Extracted
            </p>
            <ExtractedFieldList result={result} />
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-2">
              On file
            </p>
            {scan.coverages.length === 0 ? (
              <p className="text-sm text-text-muted">
                No coverage on file — scan would create a new record.
              </p>
            ) : (
              <ul className="text-sm text-text space-y-1">
                {scan.coverages.map((c, i) => (
                  <li key={i} className="tabular-nums">
                    <span className="font-medium">{c.payerName}</span>{" "}
                    <span className="text-text-muted">
                      · ID {c.memberId}
                      {c.groupNumber ? ` · GRP ${c.groupNumber}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {result.mismatches.length > 0 && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800 mb-1.5">
                  Mismatches
                </p>
                <ul className="text-xs text-amber-900 space-y-0.5">
                  {result.mismatches.map((m) => (
                    <li key={m.field} className="tabular-nums">
                      <span className="font-medium">{m.field}</span>:{" "}
                      <span className="line-through opacity-70">
                        {m.onFile ?? "—"}
                      </span>{" "}
                      → {m.scanned ?? "—"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <details className="mt-4 group">
          <summary className="cursor-pointer text-xs text-text-subtle hover:text-text-muted">
            View raw OCR text
          </summary>
          <pre className="mt-2 text-[11px] leading-relaxed text-text-muted bg-surface-muted border border-border rounded-md p-3 overflow-x-auto whitespace-pre-wrap">
            {scan.rawOcr}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}

function ExtractedFieldList({ result }: { result: CrossCheckResult }) {
  const e = result.extracted;
  const rows: { label: string; value: string | null }[] = [
    { label: "Payer", value: e.payerName },
    { label: "Member ID", value: e.memberId },
    { label: "Group", value: e.groupNumber },
    { label: "Plan", value: e.planType },
    { label: "Effective", value: e.effectiveDate },
    { label: "Rx BIN", value: e.rxBin },
    { label: "Rx PCN", value: e.rxPcn },
  ];
  return (
    <ul className="text-sm space-y-1 tabular-nums">
      {rows.map((r) => (
        <li key={r.label} className="flex items-baseline gap-2">
          <span className="text-[11px] uppercase tracking-wider text-text-subtle w-16 shrink-0">
            {r.label}
          </span>
          <span
            className={
              r.value
                ? "text-text font-medium"
                : "text-text-subtle italic"
            }
          >
            {r.value ?? "—"}
          </span>
        </li>
      ))}
    </ul>
  );
}
