"use client";

// EMR-311 — Directory filter island. Patient picks state + service, the
// compliance matcher runs client-side over the listings the server sent
// down, and matches render before non-matches with their reasons.

import { useMemo, useState } from "react";
import Link from "next/link";
import { matchDirectory } from "@/lib/clinicians";
import type {
  ClinicianListing,
  ClinicianService,
  UsState,
} from "@/lib/clinicians";

const STATES: UsState[] = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

const SERVICES: Array<{ id: ClinicianService; label: string }> = [
  { id: "medical-cannabis-cert", label: "Medical cannabis cert" },
  { id: "primary-care", label: "Primary care" },
  { id: "psychiatry", label: "Psychiatry" },
  { id: "pain-management", label: "Pain management" },
  { id: "oncology-supportive", label: "Oncology — supportive" },
  { id: "geriatrics", label: "Geriatrics" },
  { id: "pediatrics-severe-epilepsy", label: "Pediatrics — severe epilepsy" },
];

export function DirectoryFilters({ listings }: { listings: ClinicianListing[] }) {
  const [patientState, setPatientState] = useState<UsState>("NY");
  const [service, setService] = useState<ClinicianService>("medical-cannabis-cert");
  const [hasCard, setHasCard] = useState(true);

  const results = useMemo(
    () =>
      matchDirectory(listings, {
        patientState,
        patientHasCannabisCard: hasCard,
        service,
      }),
    [listings, patientState, service, hasCard],
  );

  return (
    <>
      <section className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-text mb-2">
              I'm physically located in
            </label>
            <select
              value={patientState}
              onChange={(e) => setPatientState(e.target.value as UsState)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm"
            >
              {STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">
              I'm looking for
            </label>
            <select
              value={service}
              onChange={(e) => setService(e.target.value as ClinicianService)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm"
            >
              {SERVICES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-3 text-sm pt-7">
            <input
              type="checkbox"
              checked={hasCard}
              onChange={(e) => setHasCard(e.target.checked)}
            />
            <span>I have a medical cannabis card or am eligible.</span>
          </label>
        </div>
      </section>

      <ul className="space-y-4">
        {results.map((r) => (
          <li
            key={r.listing.slug}
            className={
              "bg-white border rounded-2xl p-6 shadow-sm transition-all " +
              (r.isMatch
                ? "border-accent/30"
                : "border-slate-200 opacity-70")
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link
                  href={`/clinicians/${r.listing.slug}`}
                  className="font-display text-xl text-text hover:underline"
                >
                  {r.listing.displayName}, {r.listing.credentials}
                </Link>
                <p className="text-sm text-text-muted leading-relaxed mt-2">
                  {r.listing.bio}
                </p>
                <p className="text-xs text-text-muted mt-3">
                  Licensed in: {r.listing.licensedStates.join(", ")}
                </p>
                <p className="text-xs text-text-muted">
                  Services: {r.listing.services.join(", ")}
                </p>
              </div>
              <span
                className={
                  "text-xs font-bold px-3 py-1 rounded-full " +
                  (r.isMatch
                    ? "bg-accent text-white"
                    : "bg-slate-100 text-slate-600")
                }
              >
                {r.isMatch ? "Match" : "Not eligible"}
              </span>
            </div>
            <ul className="mt-4 space-y-1 text-xs text-text-muted">
              {r.reasons.map((reason, idx) => (
                <li key={idx}>· {reason}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </>
  );
}
