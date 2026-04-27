"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { createPrescriptionAction, type PrescribeResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea, FieldGroup } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InteractionBadge } from "@/components/ui/interaction-badge";
import {
  checkInteractions,
  type DrugInteraction,
} from "@/lib/domain/drug-interactions";
import { PharmacySelector } from "./pharmacy-selector";
import { RxPreview } from "./rx-preview";
import type { Pharmacy } from "@/lib/domain/e-prescribe";

/* ── Types ──────────────────────────────────────────────────── */

interface Product {
  id: string;
  name: string;
  brand: string | null;
  productType: string;
  route: string;
  thcConcentration: number | null;
  cbdConcentration: number | null;
  cbnConcentration: number | null;
  cbgConcentration: number | null;
  thcCbdRatio: string | null;
  concentrationUnit: string;
}

interface Medication {
  id: string;
  name: string;
  genericName: string | null;
  dosage: string | null;
  active: boolean;
}

interface DiagnosisOption {
  code: string;
  label: string;
}

/* ── Constants ──────────────────────────────────────────────── */

const PRODUCT_TYPES = [
  { value: "tablet", label: "Tablet" },
  { value: "tincture", label: "Tincture" },
  { value: "edible", label: "Edible" },
  { value: "gummy", label: "Gummy" },
  { value: "flower", label: "Flower" },
  { value: "grams", label: "Grams" },
  { value: "mL", label: "mL" },
  { value: "capsule", label: "Capsule" },
  { value: "topical", label: "Topical" },
  { value: "spray", label: "Spray" },
  { value: "suppository", label: "Suppository" },
] as const;

const DOSE_UNITS = [
  { value: "mg", label: "mg" },
  { value: "mL", label: "mL" },
  { value: "drops", label: "drops" },
  { value: "puffs", label: "puffs" },
  { value: "grams", label: "grams" },
] as const;

const DIAGNOSIS_OPTIONS: DiagnosisOption[] = [
  { code: "F41.1", label: "Generalized anxiety disorder" },
  { code: "F32.9", label: "Major depressive disorder, unspecified" },
  { code: "I10", label: "Essential hypertension" },
  { code: "E78.00", label: "Pure hypercholesterolemia, unspecified" },
  { code: "G47.00", label: "Insomnia, unspecified" },
  { code: "G89.29", label: "Other chronic pain" },
  { code: "R11.0", label: "Nausea" },
  { code: "G43.909", label: "Migraine, unspecified" },
  { code: "F43.10", label: "PTSD, unspecified" },
  { code: "C80.1", label: "Malignant neoplasm, unspecified" },
  { code: "R45.7", label: "State of emotional shock and stress" },
];

/* EMR-059 — single-viewport dense mode.
   Compact selects (32px) so dose/freq/quantity rows pack into one band. */
const SELECT_CLASS =
  "flex w-full rounded-md border border-border-strong bg-white px-2 h-8 text-sm text-text " +
  "transition-colors duration-150 ease-smooth " +
  "focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const SECTION_LABEL =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-text-subtle mb-1";
const CARD_CLASS =
  "rounded-xl shadow-sm bg-white border border-border/60 px-3 py-3 flex flex-col min-h-0";
const FIELD_LABEL = "text-[10px] uppercase tracking-wider text-text-subtle mb-1";

/* ── Submit button ──────────────────────────────────────────── */

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="md"
      className="rounded-lg h-10 px-6 text-sm font-semibold"
      disabled={pending || disabled}
    >
      {pending ? "Signing…" : "Sign & send ℞"}
    </Button>
  );
}

/* ── Main form ──────────────────────────────────────────────── */

interface ContraindicationMatch {
  id: string;
  label: string;
  severity: "absolute" | "relative" | "caution";
  rationale: string;
  requiresOverride: boolean;
  matchedOn: string;
}

export function PrescribeForm({
  patientId,
  patientName,
  products,
  medications,
  contraindicationMatches = [],
}: {
  patientId: string;
  patientName: string;
  products: Product[];
  medications: Medication[];
  contraindicationMatches?: ContraindicationMatch[];
}) {
  const [state, formAction] = useFormState<PrescribeResult | null, FormData>(
    createPrescriptionAction,
    null
  );

  // --- Medication selection ---
  const [selectedProductId, setSelectedProductId] = useState("");
  const [customProductName, setCustomProductName] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productType, setProductType] = useState("");

  // --- Dosing ---
  const [volumePerDose, setVolumePerDose] = useState("");
  const [volumeUnit, setVolumeUnit] = useState("mg");
  const [frequencyPerDay, setFrequencyPerDay] = useState("1");
  const [daysSupply, setDaysSupply] = useState("");
  const [quantity, setQuantity] = useState("");
  const [quantityManual, setQuantityManual] = useState(false);
  const [refills, setRefills] = useState("0");
  const [timingInstructions, setTimingInstructions] = useState("");

  // --- Interactions ---
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [interactionAcknowledged, setInteractionAcknowledged] = useState(false);

  // --- Contraindications (EMR-088) ---
  const blockingContraindications = contraindicationMatches.filter(
    (m) => m.requiresOverride,
  );
  const hasBlockingContraindication = blockingContraindications.length > 0;
  const [contraindicationOverrideReason, setContraindicationOverrideReason] = useState("");
  const [contraindicationAcknowledged, setContraindicationAcknowledged] = useState(false);

  // --- Diagnoses ---
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<DiagnosisOption[]>(
    []
  );
  const [customIcd10, setCustomIcd10] = useState("");

  // --- Notes ---
  const [noteToPatient, setNoteToPatient] = useState("");
  const [noteToPharmacy, setNoteToPharmacy] = useState("");

  // --- E-Prescribe (EMR-169): Pharmacy + Preview ---
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  // Derived state
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  const isCustomEntry = !selectedProductId && customProductName.trim().length > 0;
  const hasProduct = !!selectedProductId || isCustomEntry;

  // Auto-set product type when a formulary product is selected
  useEffect(() => {
    if (selectedProduct) {
      const mappedType = selectedProduct.productType.replace("_", " ");
      const match = PRODUCT_TYPES.find(
        (t) =>
          t.value.toLowerCase() === mappedType.toLowerCase() ||
          t.value.toLowerCase() === selectedProduct.productType.toLowerCase()
      );
      if (match) setProductType(match.value);
    }
  }, [selectedProduct]);

  // Auto-calculate quantity from dose x frequency x days supply
  useEffect(() => {
    if (!quantityManual && volumePerDose && frequencyPerDay && daysSupply) {
      const calc =
        parseFloat(volumePerDose) *
        parseInt(frequencyPerDay) *
        parseInt(daysSupply);
      if (!isNaN(calc) && calc > 0) {
        setQuantity(calc.toFixed(2).replace(/\.?0+$/, ""));
      }
    }
  }, [volumePerDose, frequencyPerDay, daysSupply, quantityManual]);

  // Run interaction check when a product is selected and patient has medications
  const runInteractionCheck = useCallback(() => {
    if (!selectedProduct || medications.length === 0) {
      setInteractions([]);
      return;
    }

    const cannabinoids: string[] = [];
    if (selectedProduct.thcConcentration && selectedProduct.thcConcentration > 0)
      cannabinoids.push("THC");
    if (selectedProduct.cbdConcentration && selectedProduct.cbdConcentration > 0)
      cannabinoids.push("CBD");
    if (selectedProduct.cbnConcentration && selectedProduct.cbnConcentration > 0)
      cannabinoids.push("CBN");
    if (selectedProduct.cbgConcentration && selectedProduct.cbgConcentration > 0)
      cannabinoids.push("CBG");

    if (cannabinoids.length === 0) {
      setInteractions([]);
      return;
    }

    const medNames = medications.map((m) => m.name);
    const results = checkInteractions(medNames, cannabinoids);
    setInteractions(results);
    setInteractionAcknowledged(false);
  }, [selectedProduct, medications]);

  useEffect(() => {
    runInteractionCheck();
  }, [runInteractionCheck]);

  const hasRedYellow = interactions.some(
    (i) => i.severity === "red" || i.severity === "yellow"
  );
  const mustAcknowledgeInteraction = hasRedYellow && !interactionAcknowledged;
  const mustAcknowledgeContraindication =
    hasBlockingContraindication &&
    (!contraindicationAcknowledged || contraindicationOverrideReason.trim().length < 20);
  const mustAcknowledge = mustAcknowledgeInteraction || mustAcknowledgeContraindication;

  // Toggle diagnosis selection
  function toggleDiagnosis(dx: DiagnosisOption) {
    setSelectedDiagnoses((prev) => {
      const exists = prev.find((d) => d.code === dx.code);
      if (exists) return prev.filter((d) => d.code !== dx.code);
      return [...prev, dx];
    });
  }

  function addCustomIcd10() {
    const trimmed = customIcd10.trim();
    if (!trimmed) return;
    // Don't add duplicate
    if (selectedDiagnoses.find((d) => d.code === trimmed)) return;
    setSelectedDiagnoses((prev) => [
      ...prev,
      { code: trimmed, label: "Custom ICD-10" },
    ]);
    setCustomIcd10("");
  }

  function removeCustomDiagnosis(code: string) {
    setSelectedDiagnoses((prev) => prev.filter((d) => d.code !== code));
  }

  // Build all diagnosis codes as serialized JSON for the hidden input
  const diagnosisCodesJson = JSON.stringify(selectedDiagnoses);

  // Summary data
  const medicationName = selectedProduct
    ? selectedProduct.name
    : customProductName || "Not selected";

  const sigSummary =
    volumePerDose && frequencyPerDay
      ? `${volumePerDose} ${volumeUnit} x ${frequencyPerDay} time${parseInt(frequencyPerDay) !== 1 ? "s" : ""}/day`
      : "Not set";

  return (
    <form
      action={formAction}
      className="grid grid-cols-12 gap-3 lg:max-h-[calc(100vh-9rem)] lg:overflow-hidden"
    >
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="diagnosisCodes" value={diagnosisCodesJson} />
      {interactionAcknowledged && (
        <input
          type="hidden"
          name="interactionAcknowledged"
          value="true"
        />
      )}
      {contraindicationAcknowledged && (
        <>
          <input type="hidden" name="contraindicationAcknowledged" value="true" />
          <input
            type="hidden"
            name="contraindicationOverrideReason"
            value={contraindicationOverrideReason}
          />
          <input
            type="hidden"
            name="contraindicationIds"
            value={JSON.stringify(blockingContraindications.map((c) => c.id))}
          />
        </>
      )}

      {/* ── EMR-088: Cannabis contraindication warning ─────────── */}
      {contraindicationMatches.length > 0 && (
        <Card
          className={
            "col-span-12 " +
            (hasBlockingContraindication
              ? "border-l-4 border-l-danger bg-danger/[0.04]"
              : "border-l-4 border-l-[color:var(--warning)] bg-[color:var(--warning)]/[0.04]")
          }
        >
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              Cannabis contraindication{contraindicationMatches.length !== 1 ? "s" : ""} detected
            </CardTitle>
            <CardDescription>
              {hasBlockingContraindication
                ? "This patient has one or more contraindications that require physician override before prescribing. Document your clinical reasoning below."
                : "This patient has conditions that warrant extra caution. Review the warnings below before prescribing."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-4">
              {contraindicationMatches.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg bg-surface-raised border border-border p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="font-display text-sm font-medium text-text">
                      {m.label}
                    </p>
                    <Badge
                      tone={
                        m.severity === "absolute"
                          ? "danger"
                          : m.severity === "relative"
                            ? "warning"
                            : "neutral"
                      }
                      className="text-[10px] uppercase shrink-0"
                    >
                      {m.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed mb-2">
                    {m.rationale}
                  </p>
                  <p className="text-[11px] text-text-subtle italic">
                    Matched on: {m.matchedOn}
                  </p>
                </div>
              ))}
            </div>

            {hasBlockingContraindication && (
              <div className="border-t border-border pt-4">
                <label className="block text-xs font-medium uppercase tracking-wider text-text-subtle mb-2">
                  Override reasoning (required, min 20 characters)
                </label>
                <textarea
                  value={contraindicationOverrideReason}
                  onChange={(e) =>
                    setContraindicationOverrideReason(e.target.value)
                  }
                  rows={4}
                  placeholder="Explain why prescribing is clinically appropriate despite the contraindication. This will be permanently recorded in the patient chart and audit log."
                  className="w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-text-subtle">
                    {contraindicationOverrideReason.trim().length}/20 characters minimum
                  </p>
                  <label className="flex items-center gap-2 text-xs text-text">
                    <input
                      type="checkbox"
                      checked={contraindicationAcknowledged}
                      onChange={(e) =>
                        setContraindicationAcknowledged(e.target.checked)
                      }
                      disabled={
                        contraindicationOverrideReason.trim().length < 20
                      }
                      className="h-4 w-4 rounded border-border-strong accent-accent disabled:opacity-50"
                    />
                    I take clinical responsibility for this override
                  </label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Superscription — Rx header ────────────────────────── */}
      <Card className={CARD_CLASS + " col-span-12 !py-2.5"}>
        <CardContent className="!p-0 flex items-center justify-between">
          <div className="flex items-baseline gap-3 min-w-0">
            <span className="text-3xl font-light text-accent/40 select-none leading-none">℞</span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle">Patient</p>
              <p className="text-base font-semibold text-text tracking-tight truncate">
                {patientName}
              </p>
            </div>
          </div>
          <p className="text-xs text-text-muted shrink-0">
            {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
          </p>
        </CardContent>
      </Card>

      {/* ── Inscription — Medication (left column) ──────────────── */}
      <Card className={CARD_CLASS + " col-span-12 lg:col-span-4 lg:row-span-2 min-h-0"}>
        <div className="mb-2">
          <p className={SECTION_LABEL}>Medication</p>
        </div>
        <div className="space-y-2 flex-1 min-h-0 flex flex-col">
          {/* Search / filter */}
          <FieldGroup label="Search products" htmlFor="productSearch">
            <Input
              id="productSearch"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search by name or brand..."
            />
          </FieldGroup>

          {/* Product list — packed dense */}
          {filteredProducts.length > 0 ? (
            <div className="space-y-1 flex-1 min-h-0 overflow-y-auto pr-1">
              {filteredProducts.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border transition-colors cursor-pointer ${
                    selectedProductId === p.id
                      ? "border-accent bg-accent-soft/50"
                      : "border-border hover:border-accent/40 hover:bg-accent-soft/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="productId"
                    value={p.id}
                    checked={selectedProductId === p.id}
                    onChange={() => {
                      setSelectedProductId(p.id);
                      setCustomProductName("");
                    }}
                    className="h-3.5 w-3.5 text-accent border-border-strong focus:ring-accent/20"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-text truncate">
                        {p.name}
                      </span>
                      {p.thcCbdRatio && (
                        <Badge tone="highlight" className="!text-[9px] !px-1">
                          {p.thcCbdRatio}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-text-muted truncate">
                      {p.brand && `${p.brand} \u00B7 `}
                      {p.thcConcentration !== null &&
                        `THC ${p.thcConcentration} ${p.concentrationUnit}`}
                      {p.thcConcentration !== null &&
                        p.cbdConcentration !== null &&
                        " / "}
                      {p.cbdConcentration !== null &&
                        `CBD ${p.cbdConcentration} ${p.concentrationUnit}`}
                      {" \u00B7 "}
                      {p.route}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-sm text-text-muted">
              No products in the formulary yet.
            </p>
          ) : (
            <p className="text-sm text-text-muted">
              No products match your search.
            </p>
          )}

          {/* Custom + type packed in one row */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
            <div>
              <p className={FIELD_LABEL}>Custom name</p>
              <Input
                id="customProductName"
                name="customProductName"
                className="h-8 text-xs px-2"
                value={customProductName}
                onChange={(e) => {
                  setCustomProductName(e.target.value);
                  if (e.target.value.trim()) {
                    setSelectedProductId("");
                  }
                }}
                placeholder="Off-formulary…"
              />
            </div>
            <div>
              <p className={FIELD_LABEL}>Type</p>
              <select
                id="productType"
                name="productType"
                required
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Select…</option>
                {PRODUCT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Subscription & Signa — Dosing (center column) ──────── */}
      <Card className={CARD_CLASS + " col-span-12 lg:col-span-4"}>
        <p className={SECTION_LABEL}>Dose &amp; sig</p>
        <div className="space-y-2">
          {/* Dose / unit / freq packed in 3 columns */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className={FIELD_LABEL}>Dose</p>
              <Input
                id="volumePerDose"
                name="volumePerDose"
                type="number"
                step="0.01"
                min="0.01"
                required
                className="h-8 text-sm px-2"
                value={volumePerDose}
                onChange={(e) => setVolumePerDose(e.target.value)}
                placeholder="10"
              />
            </div>
            <div>
              <p className={FIELD_LABEL}>Unit</p>
              <select
                id="volumeUnit"
                name="volumeUnit"
                required
                value={volumeUnit}
                onChange={(e) => setVolumeUnit(e.target.value)}
                className={SELECT_CLASS}
              >
                {DOSE_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className={FIELD_LABEL}>Freq/day</p>
              <select
                id="frequencyPerDay"
                name="frequencyPerDay"
                required
                value={frequencyPerDay}
                onChange={(e) => setFrequencyPerDay(e.target.value)}
                className={SELECT_CLASS}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}x
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Days / quantity / refills */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className={FIELD_LABEL}>Days</p>
              <Input
                id="daysSupply"
                name="daysSupply"
                type="number"
                min="1"
                max="365"
                required
                className="h-8 text-sm px-2"
                value={daysSupply}
                onChange={(e) => setDaysSupply(e.target.value)}
                placeholder="30"
              />
            </div>
            <div>
              <p className={FIELD_LABEL}>
                Qty {!quantityManual ? "(auto)" : ""}
              </p>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                step="0.01"
                min="0.01"
                required
                className="h-8 text-sm px-2"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setQuantityManual(true);
                }}
                placeholder="Auto"
              />
            </div>
            <div>
              <p className={FIELD_LABEL}>Refills</p>
              <select
                id="refills"
                name="refills"
                value={refills}
                onChange={(e) => setRefills(e.target.value)}
                className={SELECT_CLASS}
              >
                {Array.from({ length: 13 }, (_, i) => i).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Timing instructions */}
          <div>
            <p className={FIELD_LABEL}>Timing</p>
            <Input
              id="timingInstructions"
              name="timingInstructions"
              className="h-8 text-xs px-2"
              value={timingInstructions}
              onChange={(e) => setTimingInstructions(e.target.value)}
              placeholder='e.g. "Morning and 1 hour before bed"'
            />
          </div>
        </div>
      </Card>

      {/* ── Section 3: Safety / Interactions (right column top) ── */}
      <Card className={CARD_CLASS + " col-span-12 lg:col-span-4"}>
        <p className={SECTION_LABEL}>
          Safety check
          <span className="ml-2 normal-case tracking-normal text-text-muted text-[10px]">
            {medications.length === 0
              ? "No meds on file"
              : `${medications.length} med${medications.length !== 1 ? "s" : ""}`}
          </span>
        </p>
        <div className="space-y-2">
          {!selectedProductId && (
            <p className="text-xs text-text-subtle italic">
              Select a product to run the interaction check.
            </p>
          )}

          {selectedProductId && medications.length === 0 && (
            <p className="text-xs text-text-subtle italic">
              No conventional meds on file. Nothing to check.
            </p>
          )}

          {selectedProductId && medications.length > 0 && interactions.length === 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-accent-soft/50 border border-[color:var(--success)]/20">
              <InteractionBadge severity="green" />
              <span className="text-xs text-text">No known interactions.</span>
            </div>
          )}

          {interactions.length > 0 && (
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {interactions.map((interaction, idx) => (
                <InteractionRow key={idx} interaction={interaction} />
              ))}
            </div>
          )}

          {hasRedYellow && (
            <div className="p-2 rounded-lg border-2 border-[color:var(--danger)] bg-red-50">
              <p className="text-xs font-medium text-danger leading-snug">
                ⚠ Interaction warning — must acknowledge
              </p>
              <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={interactionAcknowledged}
                  onChange={(e) =>
                    setInteractionAcknowledged(e.target.checked)
                  }
                  className="h-3.5 w-3.5 rounded border-border-strong text-accent focus:ring-accent/20"
                />
                <span className="text-[11px] font-medium text-text">
                  Reviewed &amp; accept risks
                </span>
              </label>
            </div>
          )}
        </div>
      </Card>

      {/* ── Section 4: Diagnosis (bottom-left) ─────────────────── */}
      <Card className={CARD_CLASS + " col-span-12 lg:col-span-6 min-h-0"}>
        <p className={SECTION_LABEL}>Diagnoses (ICD-10)</p>
        <div className="space-y-2 flex-1 min-h-0 flex flex-col">
          {/* Common ICD-10 codes — packed dense */}
          <div className="space-y-1 flex-1 min-h-0 overflow-y-auto pr-1">
            {DIAGNOSIS_OPTIONS.map((dx) => {
              const isSelected = selectedDiagnoses.some(
                (d) => d.code === dx.code
              );
              return (
                <label
                  key={dx.code}
                  className={`flex items-center gap-2 p-1.5 rounded border transition-colors cursor-pointer ${
                    isSelected
                      ? "border-accent bg-accent-soft/50"
                      : "border-border hover:border-accent/40 hover:bg-accent-soft/20"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleDiagnosis(dx)}
                    className="h-3.5 w-3.5 rounded border-border-strong text-accent focus:ring-accent/20"
                  />
                  <span className="text-xs text-text truncate">
                    <span className="font-mono font-medium text-accent">
                      {dx.code}
                    </span>
                    {" \u2014 "}
                    {dx.label}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Custom ICD-10 input + Add button */}
          <div className="flex items-end gap-2 pt-1 border-t border-border/60">
            <div className="flex-1">
              <p className={FIELD_LABEL}>Other ICD-10</p>
              <Input
                id="customIcd10"
                className="h-8 text-xs px-2"
                value={customIcd10}
                onChange={(e) => setCustomIcd10(e.target.value)}
                placeholder="e.g. M54.5"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomIcd10();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addCustomIcd10}
            >
              Add
            </Button>
          </div>

          {/* Selected diagnoses as badges */}
          {selectedDiagnoses.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedDiagnoses.map((dx) => (
                <Badge
                  key={dx.code}
                  tone="accent"
                  className="cursor-pointer gap-1 pr-1 !text-[10px]"
                  onClick={() => removeCustomDiagnosis(dx.code)}
                >
                  {dx.code}
                  <span aria-hidden="true" className="opacity-60 hover:opacity-100">
                    ×
                  </span>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ── Section 5: Notes (bottom-right) ────────────────────── */}
      <Card className={CARD_CLASS + " col-span-12 lg:col-span-6"}>
        <p className={SECTION_LABEL}>Notes</p>
        <div className="space-y-2">
          <div>
            <p className={FIELD_LABEL}>To patient</p>
            <Textarea
              id="noteToPatient"
              name="noteToPatient"
              rows={2}
              className="text-xs px-2 py-1.5"
              value={noteToPatient}
              onChange={(e) => setNoteToPatient(e.target.value)}
              placeholder="Take with food. Avoid driving for 2 hours after dose."
            />
          </div>
          <div>
            <p className={FIELD_LABEL}>To pharmacy (internal)</p>
            <Textarea
              id="noteToPharmacy"
              name="noteToPharmacy"
              rows={2}
              className="text-xs px-2 py-1.5"
              value={noteToPharmacy}
              onChange={(e) => setNoteToPharmacy(e.target.value)}
              placeholder="Brand medically necessary. Do not substitute."
            />
          </div>
        </div>
      </Card>

      {/* ── Section 6: Review & Submit (full-width footer band) ─ */}
      <Card className={CARD_CLASS + " col-span-12 !py-3 ambient"}>
        <div className="flex items-center justify-between gap-4 mb-2">
          <p className={SECTION_LABEL + " !mb-0"}>Review &amp; sign</p>
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            {selectedProductId && medications.length > 0 && (
              interactions.length === 0 ? (
                <InteractionBadge severity="green" />
              ) : (
                <>
                  {interactions.some((i) => i.severity === "red") && (
                    <InteractionBadge severity="red" />
                  )}
                  {interactions.some((i) => i.severity === "yellow") && (
                    <InteractionBadge severity="yellow" />
                  )}
                  {interactions.some((i) => i.severity === "green") && (
                    <InteractionBadge severity="green" />
                  )}
                  {interactionAcknowledged && hasRedYellow && (
                    <span className="text-text-muted">(ack)</span>
                  )}
                </>
              )
            )}
          </div>
        </div>

        {/* Compact summary grid — 6 fields in one row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 px-3 py-2 rounded-lg bg-surface/80 border border-border">
          <SummaryRow label="Med" value={medicationName} />
          <SummaryRow
            label="Type"
            value={
              PRODUCT_TYPES.find((t) => t.value === productType)?.label ||
              productType ||
              "—"
            }
          />
          <SummaryRow label="Sig" value={sigSummary} />
          <SummaryRow
            label="Days"
            value={daysSupply || "—"}
          />
          <SummaryRow label="Qty" value={quantity || "—"} />
          <SummaryRow label="Refills" value={refills} />
        </div>

        {/* Pharmacy + preview/sign action band */}
        <div className="mt-3 flex flex-col md:flex-row md:items-center gap-2">
          <div className="flex-1 min-w-0">
            <PharmacySelector
              selectedId={selectedPharmacy?.id ?? null}
              onSelect={(pharm) => setSelectedPharmacy(pharm)}
            />
          </div>

          {hasProduct && volumePerDose && daysSupply && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? "Hide preview" : "Preview"}
            </Button>
          )}

          {state?.ok === false && (
            <p className="text-xs text-danger">{state.error}</p>
          )}

          <Link href={`/clinic/patients/${patientId}?tab=rx`}>
            <Button type="button" variant="ghost" size="sm">
              Cancel
            </Button>
          </Link>
          <SubmitButton disabled={mustAcknowledge} />
        </div>

        {showPreview && hasProduct && volumePerDose && daysSupply && (
          <div className="mt-3 max-h-72 overflow-y-auto">
            <RxPreview
                    patientName={patientName}
                    productName={selectedProduct?.name ?? customProductName}
                    productType={productType}
                    route={selectedProduct?.route ?? "oral"}
                    doseAmount={parseFloat(volumePerDose) || 0}
                    doseUnit={volumeUnit}
                    frequency={frequencyPerDay === "1" ? "QD" : frequencyPerDay === "2" ? "BID" : frequencyPerDay === "3" ? "TID" : "QID"}
                    frequencyLabel={`${frequencyPerDay}x daily`}
                    daysSupply={parseInt(daysSupply) || 0}
                    quantity={parseInt(quantity) || 0}
                    quantityUnit={volumeUnit}
                    refills={parseInt(refills) || 0}
                    timingInstructions={timingInstructions}
                    diagnosisCodes={selectedDiagnoses}
                    noteToPatient={noteToPatient}
                    noteToPharmacy={noteToPharmacy}
                    pharmacyId={selectedPharmacy?.id}
                    thcMg={selectedProduct?.thcConcentration ? parseFloat(volumePerDose) * selectedProduct.thcConcentration / 100 : undefined}
                    cbdMg={selectedProduct?.cbdConcentration ? parseFloat(volumePerDose) * selectedProduct.cbdConcentration / 100 : undefined}
                    providerName="Dr. Provider"
                    onSign={() => {
                      setSigning(true);
                      setTimeout(() => {
                        setSigning(false);
                        setSigned(true);
                      }, 1500);
                    }}
                    signing={signing}
                    signed={signed}
                  />
          </div>
        )}
      </Card>
    </form>
  );
}

/* ── Interaction row ────────────────────────────────────────── */

function InteractionRow({ interaction }: { interaction: DrugInteraction }) {
  const bgClass =
    interaction.severity === "red"
      ? "bg-red-50 border-red-200"
      : interaction.severity === "yellow"
        ? "bg-highlight-soft border-highlight/30"
        : "bg-accent-soft/30 border-[color:var(--success)]/20";

  return (
    <div className={`p-2 rounded border ${bgClass}`}>
      <div className="flex items-center gap-1.5">
        <InteractionBadge severity={interaction.severity} />
        <span className="text-xs font-medium text-text truncate">
          {interaction.drug}
        </span>
        <span className="text-[10px] text-text-muted">
          + {interaction.cannabinoid}
        </span>
      </div>
      <p className="text-[11px] text-text-muted leading-snug mt-0.5">
        {interaction.mechanism}
      </p>
    </div>
  );
}

/* ── Summary row — compact label/value pair for footer band ── */

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider font-medium text-text-subtle">
        {label}
      </p>
      <p className="text-xs text-text font-medium truncate">{value}</p>
    </div>
  );
}
