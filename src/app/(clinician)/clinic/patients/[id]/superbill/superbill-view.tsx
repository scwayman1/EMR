"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import { formatCurrency, type SuperbillData } from "@/lib/domain/superbill";

// ─── Types ──────────────────────────────────────────────

interface SuperbillViewProps {
  data: SuperbillData;
  patientId: string;
}

// ─── Helpers ────────────────────────────────────────────

function posLabel(code: string): string {
  const labels: Record<string, string> = {
    "02": "Telehealth",
    "11": "Office",
    "12": "Home",
    "21": "Inpatient Hospital",
    "22": "Outpatient Hospital",
    "23": "Emergency Room",
  };
  return labels[code] ?? code;
}

// ─── Main Component ─────────────────────────────────────

export function SuperbillView({ data, patientId }: SuperbillViewProps) {
  const params = useParams<{ id: string }>();
  const [signed, setSigned] = useState(data.providerSignature ?? false);
  const [signedDate, setSignedDate] = useState(data.signatureDate ?? null);

  const handleSign = useCallback(() => {
    setSigned(true);
    setSignedDate(new Date().toISOString().slice(0, 10));
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div>
      {/* Screen-only header */}
      <div className="print:hidden flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
        <div className="max-w-2xl">
          <Eyebrow className="mb-3">Billing</Eyebrow>
          <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
            Superbill
          </h1>
          <p className="text-[15px] text-text-muted mt-3 leading-relaxed">
            Printable encounter billing form for{" "}
            <span className="font-medium text-text">{data.patientName}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={handlePrint}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="mr-1"
            >
              <path
                d="M4 6V2h8v4M4 12H2.5A1.5 1.5 0 011 10.5v-3A1.5 1.5 0 012.5 6h11A1.5 1.5 0 0115 7.5v3a1.5 1.5 0 01-1.5 1.5H12M4 10h8v4H4v-4z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
            Print
          </Button>
          <Link href={`/clinic/patients/${params.id}`}>
            <Button variant="secondary" size="sm">
              Back to chart
            </Button>
          </Link>
        </div>
      </div>

      {/* Printable superbill */}
      <div className="max-w-[800px] mx-auto bg-white print:shadow-none">
        <Card
          tone="raised"
          className="print:border-0 print:shadow-none print:rounded-none"
        >
          <CardContent className="p-8 print:p-6">
            {/* ─── Practice Header ─────────────────────────────── */}
            <div className="border-b-2 border-emerald-700 pb-5 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold text-emerald-800 tracking-tight">
                    {data.practiceName}
                  </h2>
                  <p className="text-sm text-text-muted mt-1">
                    {data.practiceAddress}
                  </p>
                  <p className="text-sm text-text-muted">
                    {data.practicePhone}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-text-subtle uppercase tracking-wider">
                    NPI
                  </p>
                  <p className="text-sm font-mono text-text">
                    {data.practiceNpi}
                  </p>
                  <p className="text-[10px] text-text-subtle uppercase tracking-wider mt-2">
                    Tax ID
                  </p>
                  <p className="text-sm font-mono text-text">
                    {data.practiceTaxId}
                  </p>
                </div>
              </div>
            </div>

            {/* ─── Patient & Provider Info ──────────────────────── */}
            <div className="grid grid-cols-2 gap-8 mb-6">
              {/* Patient */}
              <div>
                <p className="text-[10px] text-text-subtle uppercase tracking-wider font-medium mb-3">
                  Patient information
                </p>
                <div className="space-y-2 text-sm">
                  <InfoRow label="Name" value={data.patientName} />
                  <InfoRow label="DOB" value={data.patientDob} />
                  <InfoRow label="Address" value={data.patientAddress} />
                  {data.patientPhone && (
                    <InfoRow label="Phone" value={data.patientPhone} />
                  )}
                  <InfoRow label="Patient ID" value={data.patientId} mono />
                  {data.insuranceName && (
                    <>
                      <div className="pt-2 border-t border-border/40" />
                      <InfoRow label="Insurance" value={data.insuranceName} />
                      {data.insuranceId && (
                        <InfoRow
                          label="Member ID"
                          value={data.insuranceId}
                          mono
                        />
                      )}
                      {data.groupNumber && (
                        <InfoRow
                          label="Group #"
                          value={data.groupNumber}
                          mono
                        />
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Provider */}
              <div>
                <p className="text-[10px] text-text-subtle uppercase tracking-wider font-medium mb-3">
                  Rendering provider
                </p>
                <div className="space-y-2 text-sm">
                  <InfoRow label="Name" value={data.providerName} />
                  <InfoRow label="NPI" value={data.providerNpi} mono />
                  <InfoRow
                    label="Credentials"
                    value={data.providerCredentials}
                  />
                </div>

                <p className="text-[10px] text-text-subtle uppercase tracking-wider font-medium mb-3 mt-6">
                  Visit information
                </p>
                <div className="space-y-2 text-sm">
                  <InfoRow label="Date of service" value={data.dateOfService} />
                  <InfoRow
                    label="Place of service"
                    value={`${data.placeOfService} - ${posLabel(data.placeOfService)}`}
                  />
                  <InfoRow
                    label="Encounter type"
                    value={data.encounterType.replace("_", " ")}
                  />
                  {data.referringProvider && (
                    <InfoRow
                      label="Referring"
                      value={data.referringProvider}
                    />
                  )}
                  {data.priorAuthNumber && (
                    <InfoRow
                      label="Prior auth"
                      value={data.priorAuthNumber}
                      mono
                    />
                  )}
                </div>
              </div>
            </div>

            {/* ─── Diagnoses ───────────────────────────────────── */}
            <div className="mb-6">
              <p className="text-[10px] text-text-subtle uppercase tracking-wider font-medium mb-3">
                Diagnoses (ICD-10)
              </p>
              {data.diagnoses.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 pr-4 text-left text-[10px] text-text-subtle uppercase tracking-wider font-medium w-16">
                        #
                      </th>
                      <th className="py-2 pr-4 text-left text-[10px] text-text-subtle uppercase tracking-wider font-medium w-28">
                        Code
                      </th>
                      <th className="py-2 text-left text-[10px] text-text-subtle uppercase tracking-wider font-medium">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {data.diagnoses.map((dx, i) => (
                      <tr key={dx.code}>
                        <td className="py-2 pr-4 text-text-muted">{i + 1}</td>
                        <td className="py-2 pr-4 font-mono text-accent text-xs font-medium">
                          {dx.code}
                        </td>
                        <td className="py-2 text-text">{dx.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-text-muted py-3">
                  No diagnoses documented.
                </p>
              )}
            </div>

            {/* ─── Procedures ──────────────────────────────────── */}
            <div className="mb-6">
              <p className="text-[10px] text-text-subtle uppercase tracking-wider font-medium mb-3">
                Procedures (CPT)
              </p>
              {data.procedures.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 pr-4 text-left text-[10px] text-text-subtle uppercase tracking-wider font-medium w-24">
                        CPT
                      </th>
                      <th className="py-2 pr-4 text-left text-[10px] text-text-subtle uppercase tracking-wider font-medium">
                        Description
                      </th>
                      <th className="py-2 pr-4 text-left text-[10px] text-text-subtle uppercase tracking-wider font-medium w-16">
                        Mod
                      </th>
                      <th className="py-2 pr-4 text-right text-[10px] text-text-subtle uppercase tracking-wider font-medium w-16">
                        Units
                      </th>
                      <th className="py-2 text-right text-[10px] text-text-subtle uppercase tracking-wider font-medium w-24">
                        Fee
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {data.procedures.map((proc) => (
                      <tr key={proc.cptCode}>
                        <td className="py-2 pr-4 font-mono text-xs font-medium text-accent">
                          {proc.cptCode}
                        </td>
                        <td className="py-2 pr-4 text-text">
                          {proc.description}
                        </td>
                        <td className="py-2 pr-4 text-text-muted text-xs">
                          {proc.modifier ?? ""}
                        </td>
                        <td className="py-2 pr-4 text-right text-text tabular-nums">
                          {proc.units}
                        </td>
                        <td className="py-2 text-right text-text tabular-nums font-medium">
                          {formatCurrency(proc.fee * proc.units)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-text-muted py-3">
                  No procedures documented.
                </p>
              )}
            </div>

            {/* ─── Totals ──────────────────────────────────────── */}
            <div className="border-t-2 border-emerald-700 pt-4 mb-8">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Total charges</span>
                    <span className="text-text font-medium tabular-nums">
                      {formatCurrency(data.totalCharges)}
                    </span>
                  </div>
                  {data.copayCollected != null && data.copayCollected > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Copay collected</span>
                      <span className="text-success tabular-nums">
                        -{formatCurrency(data.copayCollected)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t border-border pt-2">
                    <span className="text-text font-medium">Amount due</span>
                    <span className="text-text font-display text-lg tabular-nums">
                      {formatCurrency(data.amountDue ?? data.totalCharges)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Signature Line ──────────────────────────────── */}
            <div className="border-t border-border pt-6">
              <div className="flex items-end justify-between">
                <div className="flex-1 max-w-sm">
                  <p className="text-[10px] text-text-subtle uppercase tracking-wider mb-3">
                    Provider signature
                  </p>
                  {signed ? (
                    <div className="flex items-center gap-3">
                      <div className="h-10 px-4 rounded-lg bg-accent/10 border border-accent/20 flex items-center gap-2">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          className="text-accent"
                        >
                          <path
                            d="M5 8l2 2 4-4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="8"
                            cy="8"
                            r="6.5"
                            stroke="currentColor"
                            strokeWidth="1"
                          />
                        </svg>
                        <span className="text-sm text-accent font-medium">
                          Signed electronically
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="print:hidden">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSign}
                      >
                        Sign electronically
                      </Button>
                    </div>
                  )}
                  {/* Print-only signature line */}
                  <div className="hidden print:block border-b border-black/40 h-10 mt-2" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-text-subtle uppercase tracking-wider mb-1">
                    Date
                  </p>
                  <p className="text-sm text-text">
                    {signedDate ?? data.dateOfService}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <span className="text-text-subtle w-20 shrink-0">{label}</span>
      <span className={cn("text-text", mono && "font-mono text-xs")}>
        {value || "\u2014"}
      </span>
    </div>
  );
}
