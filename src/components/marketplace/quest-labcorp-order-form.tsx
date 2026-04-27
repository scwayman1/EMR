"use client";

// EMR-067 — Quest / LabCorp searchable lab ordering form.
//
// Differs from the existing `LabOrderForm` (which presents a small,
// curated catalog grouped by category) in two ways:
//   1. Full vendor catalog with type-as-you-search across name, code,
//      and aliases — every keystroke filters in-memory.
//   2. Vendor selector (Quest vs LabCorp) wires the order at submit
//      time to the right /api/labs/order partner channel.
//
// Submission hits the fake endpoint at /api/labs/order which generates
// an order ID and queues the outbound transmission AgentJob.

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, FieldGroup } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LAB_VENDOR_CATALOG,
  DEFAULT_LAB_FAVORITES,
  searchLabCatalog,
  type LabVendor,
  type LabVendorTest,
} from "@/lib/domain/lab-vendors";
import { cn } from "@/lib/utils/cn";

interface Props {
  patientId: string;
  patientName: string;
}

interface Submission {
  orderId: string;
  vendor: LabVendor;
  transmittedAt: string;
  tests: { code: string; name: string; vendorCode: string }[];
}

export function QuestLabcorpOrderForm({ patientId, patientName }: Props) {
  const [vendor, setVendor] = useState<LabVendor>("quest");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [icdInput, setIcdInput] = useState("");
  const [icdCodes, setIcdCodes] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState<"routine" | "stat" | "asap">("routine");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Submission | null>(null);

  const matches = useMemo(() => searchLabCatalog(query), [query]);

  const selectedTests = useMemo(
    () =>
      selected
        .map((c) => LAB_VENDOR_CATALOG.find((t) => t.code === c))
        .filter((t): t is LabVendorTest => Boolean(t)),
    [selected],
  );

  const fastingTests = selectedTests.filter((t) => t.fasting);

  function toggle(code: string) {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  function applyFavorite(id: string) {
    const fav = DEFAULT_LAB_FAVORITES.find((f) => f.id === id);
    if (!fav) return;
    setSelected(fav.testCodes);
    setIcdCodes(fav.diagnoses);
  }

  function addIcd() {
    const code = icdInput.trim().toUpperCase();
    if (!code) return;
    if (icdCodes.includes(code)) return;
    setIcdCodes((prev) => [...prev, code]);
    setIcdInput("");
  }

  function removeIcd(code: string) {
    setIcdCodes((prev) => prev.filter((c) => c !== code));
  }

  async function submit() {
    setError(null);
    if (selected.length === 0) {
      setError("Pick at least one test.");
      return;
    }
    if (icdCodes.length === 0) {
      setError("Add at least one ICD-10 code.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/labs/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          vendor,
          testCodes: selected,
          icd10Codes: icdCodes,
          priority,
          reason: reason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "submit_failed");
        return;
      }
      setSubmitted({
        orderId: data.orderId,
        vendor: data.vendor,
        transmittedAt: data.transmittedAt,
        tests: data.tests,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "network_error");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card tone="raised" className="border-l-4 border-l-emerald-500">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs">
              ✓
            </span>
            Lab order transmitted to{" "}
            {submitted.vendor === "quest" ? "Quest Diagnostics" : "LabCorp"}
          </CardTitle>
          <CardDescription>
            Order #{submitted.orderId} placed for {patientName} at{" "}
            {new Date(submitted.transmittedAt).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 mb-4">
            {submitted.tests.map((t) => (
              <li key={t.code} className="text-sm text-text flex items-center gap-3">
                <span className="font-mono text-xs text-text-subtle w-16 shrink-0">
                  {t.code}
                </span>
                <span className="flex-1">{t.name}</span>
                <span className="font-mono text-[11px] text-text-subtle">
                  {submitted.vendor === "quest" ? "Q-" : "L-"}
                  {t.vendorCode}
                </span>
              </li>
            ))}
          </ul>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSubmitted(null);
              setSelected([]);
              setIcdCodes([]);
              setReason("");
              setQuery("");
            }}
          >
            Place another order
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card tone="raised">
        <CardHeader>
          <CardTitle className="text-base">Lab vendor</CardTitle>
          <CardDescription>
            Routes the order to the partner&rsquo;s outbound queue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(["quest", "labcorp"] as LabVendor[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVendor(v)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg border transition-colors",
                  vendor === v
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-surface-raised text-text-muted border-border hover:bg-surface-muted",
                )}
              >
                {v === "quest" ? "Quest Diagnostics" : "LabCorp"}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card tone="raised">
        <CardHeader>
          <CardTitle className="text-base">Search labs</CardTitle>
          <CardDescription>
            Type any letter — name, code, or alias all match.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="cmp, cholesterol, hemoglobin a1c, ferritin…"
            autoFocus
          />
          <div className="mt-3 max-h-72 overflow-y-auto divide-y divide-border/60 rounded-lg border border-border">
            {matches.length === 0 && (
              <p className="px-3 py-3 text-xs text-text-subtle">
                No tests match &ldquo;{query}&rdquo;.
              </p>
            )}
            {matches.map((t) => {
              const isSelected = selected.includes(t.code);
              return (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => toggle(t.code)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                    isSelected
                      ? "bg-emerald-50"
                      : "hover:bg-surface-muted",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    readOnly
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-text-subtle tabular-nums">
                        {t.code}
                      </span>
                      <span className="text-[10px] text-text-subtle">
                        {t.category}
                      </span>
                      {t.fasting && (
                        <Badge tone="warning" className="text-[10px]">
                          Fasting
                        </Badge>
                      )}
                      {t.critical && (
                        <Badge tone="danger" className="text-[10px]">
                          Critical-eligible
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-text truncate">{t.name}</p>
                  </div>
                  <span className="font-mono text-[10px] text-text-subtle shrink-0">
                    {vendor === "quest" ? t.vendorCodes.quest : t.vendorCodes.labcorp}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card tone="raised">
        <CardHeader>
          <CardTitle className="text-base">Saved favorites</CardTitle>
          <CardDescription>
            One-click bundles of frequently-ordered tests + diagnoses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_LAB_FAVORITES.map((fav) => (
              <button
                key={fav.id}
                type="button"
                onClick={() => applyFavorite(fav.id)}
                className="px-3 py-1.5 text-xs rounded-full border border-border bg-surface-raised hover:bg-surface-muted text-text-muted"
                title={fav.description}
              >
                {fav.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {fastingTests.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">Fasting required</p>
          <p className="text-xs text-amber-700 mt-1">
            {fastingTests.map((t) => t.name).join(", ")} — instruct the patient
            to fast 8-12 hours.
          </p>
        </div>
      )}

      <Card tone="raised">
        <CardHeader>
          <CardTitle className="text-base">Clinical details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <FieldGroup label="Supporting ICD-10 diagnoses">
              <div className="flex gap-2">
                <Input
                  value={icdInput}
                  onChange={(e) => setIcdInput(e.target.value)}
                  placeholder="e.g. E11.9"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addIcd();
                    }
                  }}
                />
                <Button variant="secondary" size="sm" onClick={addIcd}>
                  Add
                </Button>
              </div>
            </FieldGroup>
            {icdCodes.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mt-2">
                {icdCodes.map((code) => (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                  >
                    <span className="font-mono">{code}</span>
                    <button
                      type="button"
                      onClick={() => removeIcd(code)}
                      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-emerald-700/70 hover:bg-emerald-200"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <FieldGroup label="Reason / clinical indication">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Clinical rationale for these labs..."
            />
          </FieldGroup>

          <FieldGroup label="Priority">
            <div className="flex gap-2">
              {(["routine", "asap", "stat"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors uppercase tracking-wide",
                    priority === p
                      ? p === "stat"
                        ? "bg-red-600 text-white border-red-600"
                        : p === "asap"
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-emerald-600 text-white border-emerald-600"
                      : "bg-surface-raised text-text-muted border-border hover:bg-surface-muted",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      {error && (
        <p className="text-xs text-red-700">
          {error === "patient_not_found"
            ? "Patient not found in your organization."
            : error === "unknown_test_codes"
            ? "One or more selected tests are not in the catalog."
            : error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <p className="text-xs text-text-subtle">
          {selected.length} test{selected.length !== 1 ? "s" : ""} selected ·{" "}
          {icdCodes.length} ICD-10
        </p>
        <Button
          onClick={submit}
          disabled={submitting || selected.length === 0 || icdCodes.length === 0}
        >
          {submitting
            ? "Transmitting…"
            : `Send to ${vendor === "quest" ? "Quest" : "LabCorp"}`}
        </Button>
      </div>
    </div>
  );
}
