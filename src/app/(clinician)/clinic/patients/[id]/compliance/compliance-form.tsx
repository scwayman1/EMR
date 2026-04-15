"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { Eyebrow, LeafSprig, EditorialRule } from "@/components/ui/ornament";
import {
  getStateForm,
  type StateFormField,
  type StateFormTemplate,
} from "@/lib/domain/state-compliance";
import { THERAPEUTIC_INDICATIONS } from "@/lib/domain/cannabis-icd10";

// ─── Types ──────────────────────────────────────────────

interface PatientInfo {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}

interface ComplianceFormViewProps {
  patient: PatientInfo;
  availableStates: { code: string; name: string }[];
  defaultStateCode: string;
  prePopulatedFields: Record<string, string>;
}

type FormStatus = "draft" | "complete" | "submitted";

// ─── ICD-10 Search Dropdown ─────────────────────────────

function ICD10SearchField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return THERAPEUTIC_INDICATIONS.filter(
      (ind) =>
        ind.condition.toLowerCase().includes(q) ||
        ind.icd10.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [query]);

  return (
    <div className="relative">
      <Input
        value={query}
        disabled={disabled}
        placeholder="Search ICD-10 code or condition..."
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filtered.map((ind) => (
            <button
              key={ind.icd10}
              type="button"
              className="w-full text-left px-4 py-2.5 hover:bg-surface-muted text-sm border-b border-border/40 last:border-0"
              onMouseDown={(e) => {
                e.preventDefault();
                setQuery(ind.icd10);
                onChange(ind.icd10);
                setOpen(false);
              }}
            >
              <span className="font-mono text-accent text-xs font-medium">
                {ind.icd10}
              </span>
              <span className="text-text-muted ml-2">{ind.condition}</span>
              <Badge tone="neutral" className="ml-2 text-[9px]">
                Level {ind.evidenceLevel}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────

export function ComplianceFormView({
  patient,
  availableStates,
  defaultStateCode,
  prePopulatedFields,
}: ComplianceFormViewProps) {
  const params = useParams<{ id: string }>();
  const [selectedState, setSelectedState] = useState(defaultStateCode);
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>(
    prePopulatedFields,
  );
  const [status, setStatus] = useState<FormStatus>("draft");
  const [signed, setSigned] = useState(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);

  const template = useMemo(() => getStateForm(selectedState), [selectedState]);

  // Which fields were auto-populated (read-only)
  const autoPopKeys = useMemo(() => {
    return new Set(Object.keys(prePopulatedFields));
  }, [prePopulatedFields]);

  const handleStateChange = useCallback(
    (code: string) => {
      setSelectedState(code);
      // Reset form but keep auto-populated values
      setFormValues({ ...prePopulatedFields });
      setStatus("draft");
      setSigned(false);
      setSignedAt(null);
    },
    [prePopulatedFields],
  );

  const updateField = useCallback((key: string, value: string | boolean) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSign = useCallback(() => {
    setSigned(true);
    setSignedAt(new Date().toISOString());
  }, []);

  const handleGenerate = useCallback(() => {
    if (!template) return;
    // Validate required fields
    const missing = template.requiredFields.filter((f) => {
      if (f.type === "signature") return !signed;
      const val = formValues[f.key];
      return f.required && (!val || val === "");
    });
    if (missing.length > 0) {
      alert(
        `Please complete required fields: ${missing.map((f) => f.label).join(", ")}`,
      );
      return;
    }
    setStatus("complete");
  }, [template, formValues, signed]);

  const handleSubmit = useCallback(() => {
    setStatus("submitted");
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ─── Render field based on type ─────────────────────

  function renderField(field: StateFormField) {
    const isAutoPopulated = autoPopKeys.has(field.key) && status === "draft";
    const value = formValues[field.key] ?? "";
    const readOnly = isAutoPopulated || status !== "draft";

    switch (field.type) {
      case "text":
        return (
          <Input
            value={String(value)}
            readOnly={readOnly}
            onChange={(e) => updateField(field.key, e.target.value)}
            className={cn(readOnly && "bg-surface-muted text-text-muted cursor-not-allowed")}
          />
        );

      case "date":
        return (
          <Input
            type="date"
            value={String(value)}
            readOnly={readOnly}
            onChange={(e) => updateField(field.key, e.target.value)}
            className={cn(readOnly && "bg-surface-muted text-text-muted cursor-not-allowed")}
          />
        );

      case "number":
        return (
          <Input
            type="number"
            value={String(value)}
            readOnly={readOnly}
            onChange={(e) => updateField(field.key, e.target.value)}
            className={cn(readOnly && "bg-surface-muted text-text-muted cursor-not-allowed")}
          />
        );

      case "select":
        return (
          <select
            value={String(value)}
            disabled={readOnly}
            onChange={(e) => updateField(field.key, e.target.value)}
            className={cn(
              "flex w-full rounded-md border border-border-strong bg-surface px-3 h-10 text-sm text-text",
              "transition-colors duration-200 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20",
              readOnly && "bg-surface-muted text-text-muted cursor-not-allowed",
            )}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case "checkbox":
        return (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              disabled={readOnly}
              onChange={(e) => updateField(field.key, e.target.checked)}
              className="h-5 w-5 rounded border-border-strong text-accent focus:ring-accent/20"
            />
            <span className="text-sm text-text">{field.label}</span>
          </label>
        );

      case "icd10":
        return (
          <ICD10SearchField
            value={String(value)}
            onChange={(val) => updateField(field.key, val)}
            disabled={readOnly}
          />
        );

      case "signature":
        return (
          <div className="flex items-center gap-4">
            {signed ? (
              <div className="flex items-center gap-3">
                <div className="h-12 px-6 rounded-lg bg-accent/10 border border-accent/20 flex items-center gap-2">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="text-accent"
                  >
                    <path
                      d="M7 10l2 2 4-4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                  </svg>
                  <span className="text-sm font-medium text-accent">
                    Electronically signed
                  </span>
                </div>
                {signedAt && (
                  <span className="text-xs text-text-muted">
                    {new Date(signedAt).toLocaleString()}
                  </span>
                )}
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSign}
                disabled={status !== "draft"}
              >
                Sign electronically
              </Button>
            )}
          </div>
        );

      default:
        return null;
    }
  }

  // ─── Status badge ──────────────────────────────────

  const statusTone =
    status === "submitted"
      ? "success"
      : status === "complete"
        ? "accent"
        : "warning";

  const statusLabel =
    status === "submitted"
      ? "Submitted"
      : status === "complete"
        ? "Complete"
        : "Draft";

  return (
    <div className="print:p-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-10">
        <div className="max-w-2xl">
          <Eyebrow className="mb-3">State compliance</Eyebrow>
          <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
            Compliance forms
          </h1>
          <p className="text-[15px] text-text-muted mt-3 leading-relaxed">
            Generate state-required certification forms for{" "}
            <span className="font-medium text-text">
              {patient.firstName} {patient.lastName}
            </span>
            . Auto-populated fields are pre-filled from the patient chart.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge tone={statusTone} className="text-xs px-3 py-1">
            {statusLabel}
          </Badge>
          <Link href={`/clinic/patients/${params.id}`}>
            <Button variant="secondary" size="sm">
              Back to chart
            </Button>
          </Link>
        </div>
      </div>

      {/* State Selector */}
      <Card tone="raised" className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LeafSprig size={16} className="text-accent" />
            Select state
          </CardTitle>
          <CardDescription>
            Choose the state whose compliance form you need to generate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {availableStates.map((s) => (
              <button
                key={s.code}
                onClick={() => handleStateChange(s.code)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition-all duration-200",
                  selectedState === s.code
                    ? "bg-accent/10 border-accent text-accent shadow-sm"
                    : "bg-surface border-border hover:bg-surface-muted hover:border-border-strong",
                )}
              >
                <span className="block text-lg font-display font-medium">
                  {s.code}
                </span>
                <span className="block text-[11px] text-text-muted mt-0.5 truncate">
                  {s.name}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form Template */}
      {template ? (
        <Card tone="raised" className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{template.formName}</CardTitle>
                <CardDescription className="mt-1.5">
                  {template.description}
                </CardDescription>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-text-subtle uppercase tracking-wider">
                  Form ID
                </p>
                <p className="text-xs font-mono text-text-muted">
                  {template.formId}
                </p>
                <p className="text-[10px] text-text-subtle mt-2">
                  Renewal: {template.renewalPeriodDays} days
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {template.requiredFields.map((field) => (
                <div key={field.key}>
                  {field.type !== "checkbox" && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <Label htmlFor={field.key}>{field.label}</Label>
                      {field.required && (
                        <span className="text-danger text-xs">*</span>
                      )}
                      {autoPopKeys.has(field.key) && (
                        <Badge tone="accent" className="text-[9px]">
                          Auto-filled
                        </Badge>
                      )}
                    </div>
                  )}
                  {renderField(field)}
                </div>
              ))}
            </div>
          </CardContent>

          <EditorialRule className="mx-6" />

          <CardFooter className="flex-wrap gap-3">
            <div className="flex items-center gap-2">
              {status === "draft" && (
                <Button onClick={handleGenerate} size="md">
                  Generate form
                </Button>
              )}
              {status === "complete" && (
                <Button onClick={handleSubmit} size="md">
                  Submit form
                </Button>
              )}
              {status === "submitted" && (
                <Button variant="secondary" size="md" disabled>
                  Submitted
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
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
            </div>
          </CardFooter>
        </Card>
      ) : (
        <Card tone="raised">
          <CardContent className="py-12 text-center">
            <p className="text-text-muted">
              No compliance form template available for the selected state.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
