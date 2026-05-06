"use client";

// Multi-step onboarding wizard for new clinics. Three steps:
//   1. Clinic basics — name, legal entity, address, contact
//   2. NPIs — Type-2 organizational NPI + supervising provider NPIs
//   3. State cannabis registries — preferred programs to enroll in
// State stays local; submission posts to `submitClinicOnboarding`.

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldGroup, Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { submitClinicOnboarding } from "./actions";
import type { OnboardingSubmitResult } from "./actions";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
] as const;

type ProviderRow = { name: string; npi: string };

type FormState = {
  clinicName: string;
  legalEntityName: string;
  addressLine1: string;
  addressLine2: string;
  addressCity: string;
  addressState: string;
  addressPostalCode: string;
  contactEmail: string;
  contactPhone: string;
  organizationalNpi: string;
  providerNpis: ProviderRow[];
  stateRegistries: string[];
  notes: string;
};

const INITIAL_STATE: FormState = {
  clinicName: "",
  legalEntityName: "",
  addressLine1: "",
  addressLine2: "",
  addressCity: "",
  addressState: "",
  addressPostalCode: "",
  contactEmail: "",
  contactPhone: "",
  organizationalNpi: "",
  providerNpis: [{ name: "", npi: "" }],
  stateRegistries: [],
  notes: "",
};

const STEPS = [
  { key: "basics", label: "Clinic basics", hint: "Who you are and where to reach you." },
  { key: "npis", label: "NPI numbers", hint: "Billing identifiers for claims and prescriptions." },
  { key: "registries", label: "State registries", hint: "Cannabis programs you plan to enroll in." },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

export function OnboardingWizard() {
  const [step, setStep] = useState<StepKey>("basics");
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<OnboardingSubmitResult | null>(null);

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const isLastStep = stepIndex === STEPS.length - 1;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function localStepErrors(target: StepKey): Record<string, string> {
    const errors: Record<string, string> = {};
    if (target === "basics") {
      if (!form.clinicName.trim()) errors.clinicName = "Clinic name is required";
      if (!form.legalEntityName.trim()) errors.legalEntityName = "Legal entity is required";
      if (!form.addressLine1.trim()) errors.addressLine1 = "Street address is required";
      if (!form.addressCity.trim()) errors.addressCity = "City is required";
      if (!form.addressState) errors.addressState = "Pick a state";
      if (!/^\d{5}(-\d{4})?$/.test(form.addressPostalCode))
        errors.addressPostalCode = "ZIP must be 5 digits or ZIP+4";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail))
        errors.contactEmail = "Enter a valid email";
      if (form.contactPhone.trim().length < 7)
        errors.contactPhone = "Phone is required";
    }
    if (target === "npis") {
      if (!/^\d{10}$/.test(form.organizationalNpi))
        errors.organizationalNpi = "Type-2 NPI must be 10 digits";
      form.providerNpis.forEach((row, i) => {
        if (!row.name.trim()) errors[`providerNpis.${i}.name`] = "Required";
        if (!/^\d{10}$/.test(row.npi)) errors[`providerNpis.${i}.npi`] = "10 digits";
      });
    }
    if (target === "registries") {
      if (form.stateRegistries.length === 0)
        errors.stateRegistries = "Pick at least one state registry";
    }
    return errors;
  }

  const currentErrors = useMemo(() => localStepErrors(step), [step, form]);

  function next() {
    if (Object.keys(currentErrors).length > 0) {
      setResult({
        ok: false,
        message: "Fix the highlighted fields to continue.",
        fieldErrors: Object.fromEntries(
          Object.entries(currentErrors).map(([k, v]) => [k, [v]]),
        ),
      });
      return;
    }
    setResult(null);
    const nextIdx = Math.min(stepIndex + 1, STEPS.length - 1);
    setStep(STEPS[nextIdx].key);
  }

  function back() {
    setResult(null);
    const prevIdx = Math.max(stepIndex - 1, 0);
    setStep(STEPS[prevIdx].key);
  }

  function submit() {
    const allErrors: Record<string, string> = {
      ...localStepErrors("basics"),
      ...localStepErrors("npis"),
      ...localStepErrors("registries"),
    };
    if (Object.keys(allErrors).length > 0) {
      setResult({
        ok: false,
        message: "Fix the highlighted fields before submitting.",
        fieldErrors: Object.fromEntries(
          Object.entries(allErrors).map(([k, v]) => [k, [v]]),
        ),
      });
      const firstKey = Object.keys(allErrors)[0];
      if (firstKey.startsWith("provider") || firstKey === "organizationalNpi")
        setStep("npis");
      else if (firstKey === "stateRegistries") setStep("registries");
      else setStep("basics");
      return;
    }

    startTransition(async () => {
      const payload = {
        ...form,
        addressLine2: form.addressLine2 || undefined,
        notes: form.notes || undefined,
      };
      const res = await submitClinicOnboarding(payload);
      setResult(res);
      if (res.ok) setForm(INITIAL_STATE);
    });
  }

  function fieldError(name: string): string | undefined {
    if (currentErrors[name]) return currentErrors[name];
    const remote = result?.fieldErrors?.[name];
    return remote?.[0];
  }

  return (
    <div className="space-y-6">
      <Stepper stepIndex={stepIndex} />

      <Card tone="raised">
        <CardContent className="pt-6">
          {step === "basics" && (
            <BasicsStep form={form} update={update} fieldError={fieldError} />
          )}
          {step === "npis" && (
            <NpisStep form={form} update={update} fieldError={fieldError} />
          )}
          {step === "registries" && (
            <RegistriesStep form={form} update={update} fieldError={fieldError} />
          )}
        </CardContent>
      </Card>

      {result?.ok && (
        <div className="rounded-md border border-accent/40 bg-accent/5 px-4 py-3 text-sm text-text">
          <p className="font-semibold text-accent">Submitted</p>
          <p className="mt-1 text-text-muted">{result.message}</p>
        </div>
      )}
      {result && !result.ok && result.message && (
        <p className="text-sm text-danger">{result.message}</p>
      )}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={back}
          disabled={stepIndex === 0 || pending}
        >
          Back
        </Button>
        {!isLastStep ? (
          <Button type="button" onClick={next} disabled={pending}>
            Continue
          </Button>
        ) : (
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? "Submitting…" : "Submit onboarding"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Stepper({ stepIndex }: { stepIndex: number }) {
  return (
    <ol className="flex items-center gap-3">
      {STEPS.map((s, i) => {
        const active = i === stepIndex;
        const done = i < stepIndex;
        return (
          <li key={s.key} className="flex-1">
            <div
              className={cn(
                "flex items-start gap-3 rounded-md px-3 py-2 border",
                active && "border-accent bg-accent/5",
                done && "border-accent/40 bg-accent/5",
                !active && !done && "border-border bg-surface",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                  active && "bg-accent text-accent-ink",
                  done && "bg-accent/30 text-accent",
                  !active && !done && "bg-surface-muted text-text-muted",
                )}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text leading-tight">
                  {s.label}
                </p>
                <p className="text-xs text-text-muted leading-tight mt-0.5">
                  {s.hint}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

type StepProps = {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  fieldError: (name: string) => string | undefined;
};

function BasicsStep({ form, update, fieldError }: StepProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <FieldGroup label="Clinic name" error={fieldError("clinicName")}>
        <Input
          value={form.clinicName}
          onChange={(e) => update("clinicName", e.target.value)}
          placeholder="Riverside Wellness"
        />
      </FieldGroup>
      <FieldGroup
        label="Legal entity name"
        hint="As registered with the state."
        error={fieldError("legalEntityName")}
      >
        <Input
          value={form.legalEntityName}
          onChange={(e) => update("legalEntityName", e.target.value)}
          placeholder="Riverside Wellness LLC"
        />
      </FieldGroup>

      <div className="md:col-span-2">
        <FieldGroup label="Street address" error={fieldError("addressLine1")}>
          <Input
            value={form.addressLine1}
            onChange={(e) => update("addressLine1", e.target.value)}
            placeholder="123 Main St"
          />
        </FieldGroup>
      </div>

      <div className="md:col-span-2">
        <FieldGroup
          label="Suite / unit (optional)"
          error={fieldError("addressLine2")}
        >
          <Input
            value={form.addressLine2}
            onChange={(e) => update("addressLine2", e.target.value)}
            placeholder="Suite 200"
          />
        </FieldGroup>
      </div>

      <FieldGroup label="City" error={fieldError("addressCity")}>
        <Input
          value={form.addressCity}
          onChange={(e) => update("addressCity", e.target.value)}
        />
      </FieldGroup>
      <div className="grid grid-cols-2 gap-4">
        <FieldGroup label="State" error={fieldError("addressState")}>
          <select
            value={form.addressState}
            onChange={(e) => update("addressState", e.target.value)}
            className="flex h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            <option value="">—</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup label="ZIP" error={fieldError("addressPostalCode")}>
          <Input
            value={form.addressPostalCode}
            onChange={(e) => update("addressPostalCode", e.target.value)}
            placeholder="00000"
          />
        </FieldGroup>
      </div>

      <FieldGroup label="Contact email" error={fieldError("contactEmail")}>
        <Input
          type="email"
          value={form.contactEmail}
          onChange={(e) => update("contactEmail", e.target.value)}
          placeholder="ops@clinic.example"
        />
      </FieldGroup>
      <FieldGroup label="Contact phone" error={fieldError("contactPhone")}>
        <Input
          value={form.contactPhone}
          onChange={(e) => update("contactPhone", e.target.value)}
          placeholder="(555) 123-4567"
        />
      </FieldGroup>
    </div>
  );
}

function NpisStep({ form, update, fieldError }: StepProps) {
  function setProvider(idx: number, patch: Partial<ProviderRow>) {
    const next = form.providerNpis.map((row, i) =>
      i === idx ? { ...row, ...patch } : row,
    );
    update("providerNpis", next);
  }

  function addProvider() {
    update("providerNpis", [...form.providerNpis, { name: "", npi: "" }]);
  }

  function removeProvider(idx: number) {
    if (form.providerNpis.length === 1) return;
    update(
      "providerNpis",
      form.providerNpis.filter((_, i) => i !== idx),
    );
  }

  return (
    <div className="space-y-6">
      <FieldGroup
        label="Organizational (Type-2) NPI"
        hint="The 10-digit NPI tied to your billing entity. Used on the 837P claim."
        error={fieldError("organizationalNpi")}
      >
        <Input
          value={form.organizationalNpi}
          onChange={(e) =>
            update("organizationalNpi", e.target.value.replace(/\D/g, "").slice(0, 10))
          }
          inputMode="numeric"
          placeholder="1234567890"
        />
      </FieldGroup>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-text">Supervising providers</p>
            <p className="text-xs text-text-muted mt-0.5">
              Each clinician who'll prescribe under this clinic. We verify each NPI.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={addProvider}>
            Add provider
          </Button>
        </div>

        <div className="space-y-3">
          {form.providerNpis.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-3 items-start"
            >
              <FieldGroup
                label={`Provider ${i + 1} name`}
                error={fieldError(`providerNpis.${i}.name`)}
              >
                <Input
                  value={row.name}
                  onChange={(e) => setProvider(i, { name: e.target.value })}
                  placeholder="Dr. Jane Doe, MD"
                />
              </FieldGroup>
              <FieldGroup label="NPI" error={fieldError(`providerNpis.${i}.npi`)}>
                <Input
                  value={row.npi}
                  inputMode="numeric"
                  onChange={(e) =>
                    setProvider(i, {
                      npi: e.target.value.replace(/\D/g, "").slice(0, 10),
                    })
                  }
                  placeholder="1234567890"
                />
              </FieldGroup>
              <div className="md:pt-7">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProvider(i)}
                  disabled={form.providerNpis.length === 1}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RegistriesStep({ form, update, fieldError }: StepProps) {
  function toggle(state: string) {
    const has = form.stateRegistries.includes(state);
    update(
      "stateRegistries",
      has
        ? form.stateRegistries.filter((s) => s !== state)
        : [...form.stateRegistries, state],
    );
  }

  return (
    <div className="space-y-5">
      <FieldGroup
        label="State cannabis registries"
        hint="Pick the state programs your providers plan to enroll in. We'll sync the right paperwork to each."
        error={fieldError("stateRegistries")}
      >
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
          {US_STATES.map((s) => {
            const active = form.stateRegistries.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                className={cn(
                  "h-10 rounded-md border text-sm font-medium transition-colors",
                  active
                    ? "border-accent bg-accent text-accent-ink shadow-sm"
                    : "border-border-strong bg-surface text-text hover:border-accent",
                )}
                aria-pressed={active}
              >
                {s}
              </button>
            );
          })}
        </div>
      </FieldGroup>

      <FieldGroup
        label="Anything else we should know? (optional)"
        hint="Multi-state structure, telemedicine plans, special populations…"
      >
        <Textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={4}
          placeholder="We operate two locations, both in NJ. Plans to expand into PA in Q3."
        />
      </FieldGroup>
    </div>
  );
}
