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

/* iOS-inspired select — 48px height, xl radius, larger text */
const SELECT_CLASS =
  "flex w-full rounded-xl border border-border-strong bg-white px-4 h-12 text-base text-text " +
  "focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 " +
  "disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";

const SECTION_LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-text-subtle mb-3";
const CARD_CLASS = "rounded-2xl shadow-sm bg-white border-border/60";

/* ── Submit button ──────────────────────────────────────────── */

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      className="w-full rounded-xl h-14 text-base font-semibold shadow-sm"
      disabled={pending || disabled}
    >
      {pending ? "Signing & sending..." : "Sign & send ℞"}
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
    <form action={formAction}>
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
            hasBlockingContraindication
              ? "border-l-4 border-l-danger bg-danger/[0.04]"
              : "border-l-4 border-l-[color:var(--warning)] bg-[color:var(--warning)]/[0.04]"
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
      <Card className={CARD_CLASS}>
        <CardContent className="pt-6 pb-4">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className={SECTION_LABEL}>Patient</p>
              <p className="text-xl font-semibold text-text tracking-tight">{patientName}</p>
            </div>
            <span className="text-5xl font-light text-accent/30 select-none">℞</span>
          </div>
          <p className="text-sm text-text-muted">
            Date of issue: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </CardContent>
      </Card>

      {/* ── Inscription — Medication ─────────────────────────── */}
      <Card className={CARD_CLASS}>
        <CardHeader>
          <CardTitle className="text-lg tracking-tight">Medication</CardTitle>
          <CardDescription>
            Select from your organization&apos;s formulary or enter a custom
            medication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search / filter */}
          <FieldGroup label="Search products" htmlFor="productSearch">
            <Input
              id="productSearch"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search by name or brand..."
            />
          </FieldGroup>

          {/* Product list */}
          {filteredProducts.length > 0 ? (
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {filteredProducts.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
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
                    className="h-4 w-4 text-accent border-border-strong focus:ring-accent/20"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-text">
                        {p.name}
                      </span>
                      <Badge tone="neutral">
                        {p.productType.replace("_", " ")}
                      </Badge>
                      {p.thcCbdRatio && (
                        <Badge tone="highlight">
                          THC:CBD {p.thcCbdRatio}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-text-muted mt-1">
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

          {/* Divider */}
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-text-subtle font-medium uppercase tracking-wider">
              or enter manually
            </span>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* Custom product name */}
          <FieldGroup label="Custom medication name" htmlFor="customProductName">
            <Input
              id="customProductName"
              name="customProductName"
              value={customProductName}
              onChange={(e) => {
                setCustomProductName(e.target.value);
                if (e.target.value.trim()) {
                  setSelectedProductId("");
                }
              }}
              placeholder="Enter medication name..."
            />
          </FieldGroup>

          {/* Product type */}
          <FieldGroup label="Type" htmlFor="productType">
            <select
              id="productType"
              name="productType"
              required
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Select type...</option>
              {PRODUCT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* ── Subscription & Signa — Dosing ──────────────────────── */}
      <Card tone="raised">
        <CardHeader>
          <CardTitle className="text-lg tracking-tight">Dosing &amp; directions</CardTitle>
          <CardDescription>
            Set the dose, frequency, supply duration, and quantity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dose + unit */}
          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Dose (amount per dose)" htmlFor="volumePerDose">
              <Input
                id="volumePerDose"
                name="volumePerDose"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={volumePerDose}
                onChange={(e) => setVolumePerDose(e.target.value)}
                placeholder="e.g. 10"
              />
            </FieldGroup>
            <FieldGroup label="Unit" htmlFor="volumeUnit">
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
            </FieldGroup>
          </div>

          {/* Frequency */}
          <FieldGroup label="Times per day" htmlFor="frequencyPerDay">
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
                  {n} {n === 1 ? "time" : "times"} per day
                </option>
              ))}
            </select>
          </FieldGroup>

          {/* Days supply, quantity, refills */}
          <div className="grid grid-cols-3 gap-4">
            <FieldGroup label="Days supply" htmlFor="daysSupply">
              <Input
                id="daysSupply"
                name="daysSupply"
                type="number"
                min="1"
                max="365"
                required
                value={daysSupply}
                onChange={(e) => setDaysSupply(e.target.value)}
                placeholder="30"
              />
            </FieldGroup>
            <FieldGroup
              label="Quantity"
              htmlFor="quantity"
              hint={
                !quantityManual
                  ? "Auto-calculated"
                  : "Manually set"
              }
            >
              <Input
                id="quantity"
                name="quantity"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setQuantityManual(true);
                }}
                placeholder="Auto"
              />
            </FieldGroup>
            <FieldGroup label="Refills" htmlFor="refills">
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
            </FieldGroup>
          </div>

          {/* Timing instructions */}
          <FieldGroup
            label="Timing instructions"
            htmlFor="timingInstructions"
            hint='e.g. "Morning and 1 hour before bed"'
          >
            <Input
              id="timingInstructions"
              name="timingInstructions"
              value={timingInstructions}
              onChange={(e) => setTimingInstructions(e.target.value)}
              placeholder="Morning and 1 hour before bed"
            />
          </FieldGroup>
        </CardContent>
      </Card>

      {/* ── Section 3: Drug Interaction Check ──────────────────── */}
      <Card tone="raised">
        <CardHeader>
          <CardTitle className="text-lg tracking-tight">Safety check</CardTitle>
          <CardDescription>
            {medications.length === 0
              ? "No medications on file for this patient."
              : `Checking against ${medications.length} medication${medications.length !== 1 ? "s" : ""} on file.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedProductId && (
            <p className="text-sm text-text-subtle italic">
              Select a product from the formulary to run the interaction check.
            </p>
          )}

          {selectedProductId && medications.length === 0 && (
            <p className="text-sm text-text-subtle italic">
              No conventional medications on file. No interactions to check.
            </p>
          )}

          {selectedProductId && medications.length > 0 && interactions.length === 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-accent-soft/50 border border-[color:var(--success)]/20">
              <InteractionBadge severity="green" />
              <span className="text-sm text-text">
                No known drug interactions detected.
              </span>
            </div>
          )}

          {interactions.length > 0 && (
            <div className="space-y-3">
              {interactions.map((interaction, idx) => (
                <InteractionRow key={idx} interaction={interaction} />
              ))}

              {/* Warning card for red/yellow interactions */}
              {hasRedYellow && (
                <div className="mt-4 p-4 rounded-xl border-2 border-[color:var(--danger)] bg-red-50">
                  <div className="flex items-start gap-3">
                    <svg
                      className="h-6 w-6 text-danger shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                      />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-danger">
                        Drug interaction warning
                      </p>
                      <p className="text-sm text-text-muted mt-1">
                        {interactions.filter((i) => i.severity === "red").length > 0 &&
                          `${interactions.filter((i) => i.severity === "red").length} contraindicated interaction${interactions.filter((i) => i.severity === "red").length !== 1 ? "s" : ""}. `}
                        {interactions.filter((i) => i.severity === "yellow").length > 0 &&
                          `${interactions.filter((i) => i.severity === "yellow").length} caution interaction${interactions.filter((i) => i.severity === "yellow").length !== 1 ? "s" : ""}. `}
                        You must acknowledge these interactions before proceeding.
                      </p>
                      <label className="flex items-center gap-2 mt-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={interactionAcknowledged}
                          onChange={(e) =>
                            setInteractionAcknowledged(e.target.checked)
                          }
                          className="h-4 w-4 rounded border-border-strong text-accent focus:ring-accent/20"
                        />
                        <span className="text-sm font-medium text-text">
                          I have reviewed the drug interactions and accept the
                          risks
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 4: Diagnosis Linking ───────────────────────── */}
      <Card tone="raised">
        <CardHeader>
          <CardTitle className="text-lg tracking-tight">Diagnosis</CardTitle>
          <CardDescription>
            Link relevant ICD-10 diagnosis codes to this prescription.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Common ICD-10 codes */}
          <div className="space-y-2">
            {DIAGNOSIS_OPTIONS.map((dx) => {
              const isSelected = selectedDiagnoses.some(
                (d) => d.code === dx.code
              );
              return (
                <label
                  key={dx.code}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? "border-accent bg-accent-soft/50"
                      : "border-border hover:border-accent/40 hover:bg-accent-soft/20"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleDiagnosis(dx)}
                    className="h-4 w-4 rounded border-border-strong text-accent focus:ring-accent/20"
                  />
                  <span className="text-sm text-text">
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

          {/* Custom ICD-10 input */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <FieldGroup label="Other ICD-10 code" htmlFor="customIcd10">
                <Input
                  id="customIcd10"
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
              </FieldGroup>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={addCustomIcd10}
            >
              Add
            </Button>
          </div>

          {/* Selected diagnoses as badges */}
          {selectedDiagnoses.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {selectedDiagnoses.map((dx) => (
                <Badge
                  key={dx.code}
                  tone="accent"
                  className="cursor-pointer gap-1.5 pr-1.5"
                  onClick={() => removeCustomDiagnosis(dx.code)}
                >
                  {dx.code}
                  <svg
                    className="h-3 w-3 opacity-60 hover:opacity-100"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 5: Notes ───────────────────────────────────── */}
      <Card tone="raised">
        <CardHeader>
          <CardTitle className="text-lg tracking-tight">Notes</CardTitle>
          <CardDescription>
            Patient-facing and pharmacy notes for this prescription.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup
            label="Note to patient"
            htmlFor="noteToPatient"
            hint="Shown to the patient on their medications page"
          >
            <Textarea
              id="noteToPatient"
              name="noteToPatient"
              rows={3}
              value={noteToPatient}
              onChange={(e) => setNoteToPatient(e.target.value)}
              placeholder="Take with food. Avoid driving for 2 hours after dose."
            />
          </FieldGroup>
          <FieldGroup
            label="Note to pharmacy"
            htmlFor="noteToPharmacy"
            hint="Internal only - not shown to patient"
          >
            <Textarea
              id="noteToPharmacy"
              name="noteToPharmacy"
              rows={2}
              value={noteToPharmacy}
              onChange={(e) => setNoteToPharmacy(e.target.value)}
              placeholder="Brand medically necessary. Do not substitute."
            />
          </FieldGroup>
        </CardContent>
      </Card>

      {/* ── Section 6: Review & Submit ─────────────────────────── */}
      <Card tone="ambient">
        <CardHeader>
          <CardTitle className="text-lg tracking-tight">Review &amp; sign</CardTitle>
          <CardDescription>
            Review the prescription details before creating.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl bg-surface/80 border border-border p-5 space-y-4">
            {/* Summary grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <SummaryRow label="Medication" value={medicationName} />
              <SummaryRow
                label="Type"
                value={
                  PRODUCT_TYPES.find((t) => t.value === productType)?.label ||
                  productType ||
                  "Not set"
                }
              />
              <SummaryRow label="Sig" value={sigSummary} />
              <SummaryRow
                label="Days supply"
                value={daysSupply ? `${daysSupply} days` : "Not set"}
              />
              <SummaryRow
                label="Quantity"
                value={quantity || "Not set"}
              />
              <SummaryRow
                label="Refills"
                value={refills}
              />
            </div>

            {/* Timing */}
            {timingInstructions && (
              <div className="pt-2 border-t border-border/60">
                <SummaryRow label="Timing" value={timingInstructions} />
              </div>
            )}

            {/* Diagnoses */}
            {selectedDiagnoses.length > 0 && (
              <div className="pt-2 border-t border-border/60">
                <p className="text-xs font-medium text-text-muted mb-2">
                  Linked diagnoses
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDiagnoses.map((dx) => (
                    <Badge key={dx.code} tone="accent">
                      {dx.code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Interaction status */}
            {selectedProductId && medications.length > 0 && (
              <div className="pt-2 border-t border-border/60">
                <p className="text-xs font-medium text-text-muted mb-2">
                  Interaction status
                </p>
                {interactions.length === 0 ? (
                  <InteractionBadge severity="green" />
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
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
                      <span className="text-xs text-text-muted ml-1">
                        (acknowledged)
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── E-Prescribe: Pharmacy Selection (EMR-169) ─── */}
          <div className="mt-8">
            <PharmacySelector
              selectedId={selectedPharmacy?.id ?? null}
              onSelect={(pharm) => setSelectedPharmacy(pharm)}
            />
          </div>

          {/* ── E-Prescribe: Preview & Sign (EMR-169) ──────── */}
          {hasProduct && volumePerDose && daysSupply && (
            <div className="mt-6">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? "Hide preview" : "Preview prescription"}
              </Button>
              {showPreview && (
                <div className="mt-4">
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
            </div>
          )}

          {/* Error display */}
          {state?.ok === false && (
            <p className="text-sm text-danger mt-4">{state.error}</p>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-4 mt-6">
            <Link href={`/clinic/patients/${patientId}?tab=rx`}>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
            <SubmitButton disabled={mustAcknowledge} />
          </div>
        </CardContent>
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
    <div className={`p-4 rounded-xl border ${bgClass}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <InteractionBadge severity={interaction.severity} />
        <span className="text-sm font-medium text-text">
          {interaction.drug}
        </span>
        <span className="text-xs text-text-muted">
          + {interaction.cannabinoid}
        </span>
      </div>
      <p className="text-sm text-text-muted">{interaction.mechanism}</p>
      <p className="text-xs text-text-subtle mt-1">
        <span className="font-medium">Recommendation:</span>{" "}
        {interaction.recommendation}
      </p>
    </div>
  );
}

/* ── Summary row ────────────────────────────────────────────── */

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className="text-sm text-text mt-0.5">{value}</p>
    </div>
  );
}
