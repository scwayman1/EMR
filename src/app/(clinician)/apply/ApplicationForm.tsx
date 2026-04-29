"use client";

// EMR-311 — Application form. Posts to the `submitClinicianApplication`
// server action. Form-level state stays in-component; field errors come
// back from the action.

import { useState, useTransition } from "react";
import { submitClinicianApplication } from "./actions";
import type { ApplicationSubmitResult } from "./actions";

const SERVICES = [
  { id: "medical-cannabis-cert", label: "Medical cannabis certification" },
  { id: "primary-care", label: "Primary care" },
  { id: "psychiatry", label: "Psychiatry" },
  { id: "pain-management", label: "Pain management" },
  { id: "oncology-supportive", label: "Oncology — supportive care" },
  { id: "geriatrics", label: "Geriatrics" },
  { id: "pediatrics-severe-epilepsy", label: "Pediatrics — severe epilepsy" },
];

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

export function ApplicationForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ApplicationSubmitResult | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await submitClinicianApplication(formData);
      setResult(res);
      if (res.ok) (e.target as HTMLFormElement).reset();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <Field label="First name" name="firstName" required errors={result?.fieldErrors?.firstName} />
      <Field label="Last name" name="lastName" required errors={result?.fieldErrors?.lastName} />

      <div>
        <label className="block text-sm font-semibold text-text mb-2">
          Credentials
        </label>
        <select
          name="credentials"
          required
          className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="MD">MD</option>
          <option value="DO">DO</option>
          <option value="NP">NP</option>
          <option value="PA">PA</option>
          <option value="DC">DC</option>
        </select>
      </div>

      <Field label="Email" name="email" type="email" required errors={result?.fieldErrors?.email} />
      <Field label="Phone" name="phone" required errors={result?.fieldErrors?.phone} />
      <Field label="NPI (10 digits)" name="npi" required errors={result?.fieldErrors?.npi} />

      <div>
        <label className="block text-sm font-semibold text-text mb-2">
          Short bio
        </label>
        <textarea
          name="bio"
          required
          rows={4}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {result?.fieldErrors?.bio && (
          <p className="text-xs text-red-600 mt-1">
            {result.fieldErrors.bio.join(" ")}
          </p>
        )}
      </div>

      <CheckboxGrid
        label="States where you hold an active medical license"
        name="licensedStates"
        options={STATES.map((s) => ({ id: s, label: s }))}
      />
      <CheckboxGrid
        label="State medical cannabis programs you are enrolled in"
        name="cannabisProgramStates"
        options={STATES.map((s) => ({ id: s, label: s }))}
      />
      <CheckboxGrid
        label="Services you offer"
        name="services"
        options={SERVICES}
      />

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="deaSchedule3Plus" />
        <span>I hold a DEA registration that allows scheduled prescriptions.</span>
      </label>

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="acceptsInsurance" />
        <span>I accept commercial insurance.</span>
      </label>

      <Field
        label="Cash-pay rate for the most common visit (in cents — e.g. 22500 = $225)"
        name="cashRateCents"
        type="number"
        required
      />

      <button
        type="submit"
        disabled={pending}
        className="px-6 py-3 rounded-full bg-accent text-white font-semibold hover:bg-accent/90 disabled:opacity-50 transition-all"
      >
        {pending ? "Submitting…" : "Submit application"}
      </button>

      {result && !result.ok && result.message && (
        <p className="text-sm text-red-600">{result.message}</p>
      )}
      {result && result.ok && (
        <p className="text-sm text-accent font-semibold">{result.message}</p>
      )}
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  errors,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  errors?: string[];
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-text mb-2">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
      />
      {errors && (
        <p className="text-xs text-red-600 mt-1">{errors.join(" ")}</p>
      )}
    </div>
  );
}

function CheckboxGrid({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: Array<{ id: string; label: string }>;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-text mb-3">{label}</p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {options.map((o) => (
          <label
            key={o.id}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white hover:border-accent cursor-pointer"
          >
            <input type="checkbox" name={name} value={o.id} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
