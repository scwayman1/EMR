"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import {
  AVAILABLE_METRICS,
  toCSV,
  toJSON,
  type ExportConfig,
  type ExportFormat,
  type DeidentificationLevel,
  type ExportRow,
} from "@/lib/domain/outcome-export";

/* ── Constants ───────────────────────────────────────────── */

const FORMAT_OPTIONS: { key: ExportFormat; label: string; desc: string; icon: string }[] = [
  { key: "csv", label: "CSV", desc: "Comma-separated values. Open in Excel, Google Sheets, or any data tool.", icon: "CSV" },
  { key: "json", label: "JSON", desc: "Structured JSON with metadata. Ideal for programmatic analysis.", icon: "{}" },
];

const DEIDENT_OPTIONS: { key: DeidentificationLevel; label: string; desc: string }[] = [
  { key: "full", label: "Full de-identification", desc: "HIPAA Safe Harbor. No direct identifiers. Age ranges only. Suitable for public research." },
  { key: "limited", label: "Limited data set", desc: "Dates, city, state, zip included. Requires data use agreement (DUA)." },
  { key: "none", label: "No de-identification", desc: "Raw data with patient identifiers. Internal use only. NOT for external sharing." },
];

/* ── Demo data generator ─────────────────────────────────── */

function generateDemoRows(config: ExportConfig): ExportRow[] {
  const rows: ExportRow[] = [];
  const conditions = ["Chronic Pain", "Anxiety", "Insomnia", "PTSD", "Nausea"];
  const products = ["Tincture", "Flower", "Edible", "Topical", "Vaporizer"];
  const routes = ["oral", "inhalation", "sublingual", "topical"];
  const sexes = ["M", "F"];
  const ageRanges = ["18-29", "30-39", "40-49", "50-59", "60-69"];

  const patientCount = 25;
  const recordsPerPatient = 4;

  for (let p = 0; p < patientCount; p++) {
    const patientHash = `DEID-${String(p + 1).padStart(8, "0")}`;

    for (let r = 0; r < recordsPerPatient; r++) {
      for (const metricKey of config.metrics) {
        const row: ExportRow = {
          patientHash,
          metric: metricKey,
          value: Math.round(Math.random() * 8 + 1),
          loggedAt: new Date(
            Date.now() - Math.random() * 90 * 86400000,
          ).toISOString().slice(0, 10),
        };

        if (config.includeDemographics) {
          row.ageRange = ageRanges[p % ageRanges.length];
          row.sex = sexes[p % sexes.length];
        }
        if (config.includeConditions) {
          row.primaryCondition = conditions[p % conditions.length];
          row.icd10Code = `R${52 + (p % 5)}.${r}`;
        }
        if (config.includeProducts) {
          row.productType = products[p % products.length];
          row.route = routes[p % routes.length];
          row.thcMgPerDose = Math.round(Math.random() * 20 + 2);
          row.cbdMgPerDose = Math.round(Math.random() * 30 + 5);
        }
        if (config.includeDosing) {
          row.daysOnTreatment = Math.floor(Math.random() * 180 + 7);
        }

        rows.push(row);
      }
    }
  }

  return rows;
}

/* ── Main component ──────────────────────────────────────── */

export function ExportWizard() {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set(["pain", "sleep"]));
  const [includeProducts, setIncludeProducts] = useState(true);
  const [includeDemographics, setIncludeDemographics] = useState(true);
  const [includeConditions, setIncludeConditions] = useState(true);
  const [includeDosing, setIncludeDosing] = useState(false);
  const [deidentLevel, setDeidentLevel] = useState<DeidentificationLevel>("full");
  const [generatedData, setGeneratedData] = useState<ExportRow[] | null>(null);
  const [generatedOutput, setGeneratedOutput] = useState<string | null>(null);

  const config: ExportConfig = useMemo(
    () => ({
      format,
      deidentificationLevel: deidentLevel,
      dateRange: { start: startDate, end: endDate },
      metrics: Array.from(selectedMetrics),
      includeProducts,
      includeDemographics,
      includeConditions,
      includeDosing,
    }),
    [format, deidentLevel, startDate, endDate, selectedMetrics, includeProducts, includeDemographics, includeConditions, includeDosing],
  );

  const toggleMetric = useCallback((key: string) => {
    setSelectedMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleGenerate = useCallback(() => {
    const rows = generateDemoRows(config);
    setGeneratedData(rows);
    const output = format === "csv" ? toCSV(rows, config) : toJSON(rows, config);
    setGeneratedOutput(output);
  }, [config, format]);

  const handleDownload = useCallback(() => {
    if (!generatedOutput) return;
    const ext = format === "csv" ? "csv" : "json";
    const mime = format === "csv" ? "text/csv" : "application/json";
    const blob = new Blob([generatedOutput], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leafjourney-outcomes-${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generatedOutput, format]);

  const uniquePatients = useMemo(() => {
    if (!generatedData) return 0;
    return new Set(generatedData.map((r) => r.patientHash)).size;
  }, [generatedData]);

  // Preview: first 5 rows
  const previewRows = useMemo(() => generatedData?.slice(0, 5) ?? [], [generatedData]);

  return (
    <div className="space-y-8">
      {/* Step 1: Format */}
      <div>
        <StepLabel step={1} label="Select export format" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => { setFormat(opt.key); setGeneratedData(null); setGeneratedOutput(null); }}
              className={cn(
                "text-left rounded-xl border p-5 transition-all duration-200",
                format === opt.key
                  ? "bg-[#047857]/5 border-[#047857] ring-2 ring-[#047857]/20"
                  : "bg-white border-border hover:border-border-strong",
              )}
            >
              <span
                className={cn(
                  "text-xs font-bold px-2 py-1 rounded",
                  format === opt.key ? "bg-[#047857]/10 text-[#047857]" : "bg-surface-muted text-text-muted",
                )}
              >
                {opt.icon}
              </span>
              <p className="text-sm font-medium text-text mt-3">{opt.label}</p>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Date range */}
      <div>
        <StepLabel step={2} label="Select date range" />
        <div className="flex flex-col sm:flex-row gap-4 mt-3">
          <div className="flex-1">
            <Label htmlFor="start-date" className="mb-1.5 block">Start date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="end-date" className="mb-1.5 block">End date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Step 3: Select metrics */}
      <div>
        <StepLabel step={3} label="Select outcome metrics" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          {AVAILABLE_METRICS.map((m) => {
            const isSelected = selectedMetrics.has(m.key);
            return (
              <label
                key={m.key}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200",
                  isSelected
                    ? "bg-[#047857]/5 border-[#047857]/30"
                    : "bg-white border-border hover:border-border-strong",
                )}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleMetric(m.key)}
                  className="h-4 w-4 rounded border-border-strong text-[#047857] focus:ring-[#047857]/20"
                />
                <span className={cn("text-sm", isSelected ? "text-text font-medium" : "text-text-muted")}>
                  {m.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Step 4: Options */}
      <div>
        <StepLabel step={4} label="Include additional data" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <ToggleOption label="Products" checked={includeProducts} onChange={setIncludeProducts} />
          <ToggleOption label="Demographics" checked={includeDemographics} onChange={setIncludeDemographics} />
          <ToggleOption label="Conditions" checked={includeConditions} onChange={setIncludeConditions} />
          <ToggleOption label="Dosing" checked={includeDosing} onChange={setIncludeDosing} />
        </div>
      </div>

      {/* Step 5: De-identification level */}
      <div>
        <StepLabel step={5} label="De-identification level" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
          {DEIDENT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setDeidentLevel(opt.key)}
              className={cn(
                "text-left rounded-xl border p-4 transition-all duration-200",
                deidentLevel === opt.key
                  ? "bg-[#047857]/5 border-[#047857] ring-2 ring-[#047857]/20"
                  : "bg-white border-border hover:border-border-strong",
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={cn(
                    "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                    deidentLevel === opt.key ? "border-[#047857]" : "border-border-strong",
                  )}
                >
                  {deidentLevel === opt.key && (
                    <div className="h-2 w-2 rounded-full bg-[#047857]" />
                  )}
                </div>
                <span className="text-sm font-medium text-text">{opt.label}</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">{opt.desc}</p>
            </button>
          ))}
        </div>
        {deidentLevel === "none" && (
          <p className="text-xs text-danger mt-2">
            Warning: Exporting without de-identification includes PHI. Ensure compliance with HIPAA and internal policies.
          </p>
        )}
      </div>

      {/* Generate & Download */}
      <Card tone="raised">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button
              onClick={handleGenerate}
              disabled={selectedMetrics.size === 0}
              size="lg"
            >
              Generate export
            </Button>
            {generatedData && (
              <Button onClick={handleDownload} variant="secondary" size="lg">
                Download .{format}
              </Button>
            )}
            {generatedData && (
              <div className="flex items-center gap-3 ml-auto">
                <Badge tone="accent" className="text-xs">
                  {generatedData.length.toLocaleString()} records
                </Badge>
                <span className="text-xs text-text-muted">
                  covering {uniquePatients} patients
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview table */}
      {previewRows.length > 0 && (
        <div>
          <h3 className="font-display text-lg text-text tracking-tight mb-3">Preview (first 5 rows)</h3>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-muted border-b border-border">
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-subtle font-medium">Patient</th>
                  {includeDemographics && (
                    <>
                      <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-subtle font-medium">Age</th>
                      <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-subtle font-medium">Sex</th>
                    </>
                  )}
                  {includeConditions && (
                    <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-subtle font-medium">Condition</th>
                  )}
                  {includeProducts && (
                    <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-subtle font-medium">Product</th>
                  )}
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-subtle font-medium">Metric</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-subtle font-medium">Value</th>
                  <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-subtle font-medium">Date</th>
                  {includeDosing && (
                    <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-subtle font-medium">Days</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-surface-muted/50 transition-colors">
                    <td className="px-4 py-2 font-mono text-xs text-text-muted">{row.patientHash}</td>
                    {includeDemographics && (
                      <>
                        <td className="px-4 py-2 text-xs text-text-muted">{row.ageRange ?? "-"}</td>
                        <td className="px-4 py-2 text-xs text-text-muted">{row.sex ?? "-"}</td>
                      </>
                    )}
                    {includeConditions && (
                      <td className="px-4 py-2 text-xs text-text-muted">{row.primaryCondition ?? "-"}</td>
                    )}
                    {includeProducts && (
                      <td className="px-4 py-2 text-xs text-text-muted">{row.productType ?? "-"}</td>
                    )}
                    <td className="px-4 py-2 text-xs text-text">{row.metric}</td>
                    <td className="px-4 py-2 text-xs font-medium text-text">{row.value}</td>
                    <td className="px-4 py-2 text-xs text-text-muted">{row.loggedAt}</td>
                    {includeDosing && (
                      <td className="px-4 py-2 text-xs text-text-muted">{row.daysOnTreatment ?? "-"}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────── */

function StepLabel({ step, label }: { step: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-7 w-7 rounded-full bg-[#047857] text-white text-xs font-bold flex items-center justify-center shrink-0">
        {step}
      </span>
      <h3 className="font-display text-lg text-text tracking-tight">{label}</h3>
    </div>
  );
}

function ToggleOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200",
        checked
          ? "bg-[#047857]/5 border-[#047857]/30"
          : "bg-white border-border hover:border-border-strong",
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors duration-200",
          checked ? "bg-[#047857]" : "bg-surface-muted border border-border-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked && "translate-x-4",
          )}
        />
      </button>
      <span className={cn("text-sm", checked ? "text-text font-medium" : "text-text-muted")}>
        {label}
      </span>
    </label>
  );
}
