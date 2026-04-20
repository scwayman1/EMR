import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import {
  DOSING_PROTOCOLS,
  cannabinoidProfile,
  findProtocolById,
  protocolId,
  type CannabinoidProfile,
  type DosingProtocol,
} from "@/lib/domain/cannabis-dosing-protocols";
import { PrintAction } from "./print-action";

interface PageProps {
  params: { id: string };
}

export function generateStaticParams() {
  return DOSING_PROTOCOLS.map((p) => ({ id: protocolId(p) }));
}

export function generateMetadata({ params }: PageProps) {
  const protocol = findProtocolById(params.id);
  return {
    title: protocol ? `${protocol.condition} — Dosing Protocol` : "Dosing Protocol",
  };
}

export default function ProtocolDetailPage({ params }: PageProps) {
  const protocol = findProtocolById(params.id);
  if (!protocol) notFound();

  const profile = cannabinoidProfile(protocol);

  return (
    <PageShell maxWidth="max-w-[960px]" className="protocol-detail">
      {/* Screen-only controls */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link href="/clinic/library/protocols">
          <Button variant="secondary" size="sm">
            &larr; All protocols
          </Button>
        </Link>
        <PrintAction />
      </div>

      <header className="mb-8 protocol-print-header">
        <Eyebrow className="mb-3 print:text-black">
          Dosing Protocol · {protocol.route}
        </Eyebrow>
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1] print:text-black">
            {protocol.condition}
          </h1>
          <CannabinoidBadge profile={profile} />
        </div>
        <p className="text-[15px] text-text-muted mt-3 leading-relaxed print:text-slate-700">
          Titration template for a cannabis-{protocol.experienceLevel} patient
          via {protocol.route}. Titrate based on response and tolerability.
        </p>
      </header>

      {/* Top-line summary */}
      <Card tone="raised" className="mb-6 protocol-card">
        <CardContent className="py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <SummaryStat
              label="Starting THC"
              value={protocol.startingDose.thcMg}
              unit="mg"
            />
            <SummaryStat
              label="Starting CBD"
              value={protocol.startingDose.cbdMg}
              unit="mg"
            />
            <SummaryStat
              label="Max THC/day"
              value={protocol.maxDailyDose.thcMg}
              unit="mg"
              emphasis
            />
            <SummaryStat
              label="Max CBD/day"
              value={protocol.maxDailyDose.cbdMg}
              unit="mg"
              emphasis
            />
          </div>
        </CardContent>
      </Card>

      {/* Titration schedule */}
      <Card tone="raised" className="mb-6 protocol-card">
        <CardHeader>
          <CardTitle>Titration schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-4 text-xs uppercase tracking-wide font-medium text-text-subtle">
                    Week
                  </th>
                  <th className="py-2 pr-4 text-xs uppercase tracking-wide font-medium text-text-subtle">
                    THC (mg)
                  </th>
                  <th className="py-2 pr-4 text-xs uppercase tracking-wide font-medium text-text-subtle">
                    CBD (mg)
                  </th>
                  <th className="py-2 pr-4 text-xs uppercase tracking-wide font-medium text-text-subtle">
                    Frequency
                  </th>
                  <th className="py-2 text-xs uppercase tracking-wide font-medium text-text-subtle">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {protocol.titrationSteps.map((step) => (
                  <tr key={step.week} className="align-top break-inside-avoid">
                    <td className="py-3 pr-4 font-medium text-text tabular-nums">
                      {step.week}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-text">
                      {step.thcMg}
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-text">
                      {step.cbdMg}
                    </td>
                    <td className="py-3 pr-4 text-text-muted">
                      {step.frequency}
                    </td>
                    <td className="py-3 text-text-muted">{step.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      <Card tone="raised" className="mb-6 protocol-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WarningGlyph />
            Warnings & counselling
          </CardTitle>
        </CardHeader>
        <CardContent>
          {protocol.warnings.length === 0 ? (
            <p className="text-sm text-text-muted">
              No specific warnings documented.
            </p>
          ) : (
            <ul className="space-y-2">
              {protocol.warnings.map((w, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-text leading-relaxed break-inside-avoid"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 rounded-full bg-highlight shrink-0"
                  />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Monitoring */}
      <Card tone="raised" className="mb-6 protocol-card">
        <CardHeader>
          <CardTitle>Monitoring schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text leading-relaxed">
            {protocol.monitoringSchedule}
          </p>
        </CardContent>
      </Card>

      <EditorialRule className="my-8 print:hidden" />

      <div className="text-xs text-text-subtle print:hidden">
        Reference only. Always individualise dosing to the patient&apos;s
        response, tolerability, and concomitant medications.
      </div>

      {/* Print-only footer */}
      <div className="hidden print:block mt-6 pt-4 border-t border-slate-300 text-[10px] text-slate-600">
        Leafjourney EMR · Dosing protocol reference · {protocol.condition} ·
        {" "}
        {new Date().toLocaleDateString()}
      </div>

      <PrintStyles />
    </PageShell>
  );
}

/* ── Small pieces ────────────────────────────────────────────── */

function SummaryStat({
  label,
  value,
  unit,
  emphasis,
}: {
  label: string;
  value: number;
  unit: string;
  emphasis?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-text-subtle font-medium print:text-slate-600">
        {label}
      </p>
      <p
        className={
          "mt-1 font-display tabular-nums " +
          (emphasis ? "text-2xl text-highlight" : "text-2xl text-text")
        }
      >
        {value}
        <span className="text-sm text-text-subtle font-normal ml-1 print:text-slate-600">
          {unit}
        </span>
      </p>
    </div>
  );
}

function CannabinoidBadge({ profile }: { profile: CannabinoidProfile }) {
  const tone =
    profile === "THC" ? "warning" : profile === "CBD" ? "success" : "accent";
  return <Badge tone={tone}>{profile}</Badge>;
}

function WarningGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="text-highlight"
    >
      <path
        d="M8 1.5L14.5 13.5H1.5L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M8 6.5V9.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

/**
 * Print-friendly styles. The on-screen presentation keeps the iOS-style
 * soft surfaces; when the clinician prints for their reference binder the
 * layout strips chrome and renders a crisp black-on-white document.
 */
function PrintStyles() {
  return (
    <style>
      {`
        @media print {
          @page { margin: 0.55in; size: letter; }
          body {
            background: white !important;
            color: #111827 !important;
          }
          .protocol-detail {
            padding: 0 !important;
            max-width: 100% !important;
          }
          .protocol-detail h1,
          .protocol-detail h2,
          .protocol-detail h3 {
            color: #111827 !important;
          }
          .protocol-card {
            break-inside: avoid;
            box-shadow: none !important;
            border: 1px solid #d1d5db !important;
            background: white !important;
            margin-bottom: 0.75rem !important;
          }
          .protocol-card table {
            border-collapse: collapse;
          }
          .protocol-card th,
          .protocol-card td {
            color: #111827 !important;
          }
          .protocol-print-header {
            margin-bottom: 0.75rem !important;
          }
          tr { page-break-inside: avoid; }
        }
      `}
    </style>
  );
}
