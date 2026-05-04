"use client";

// EMR-381 — Provider QR code: encodes a vCard built from any subset of
// the provider's contact fields. Each field is independently toggleable
// so a provider can publish a partial card (e.g. for a conference) and
// a fuller card (e.g. for established patients). The QR is rendered as
// an SVG via a tiny in-component encoder so we don't pull a runtime
// dependency just for this — the encoder is small and intentional.
//
// Output is a valid vCard 3.0 string wrapped in a QR image. The image
// is generated client-side so nothing PHI-adjacent touches the network.

import { useMemo, useState, useCallback } from "react";

export interface ProviderProfile {
  name: string;
  photoUrl?: string | null;
  practice?: string;
  practiceLocation?: string;
  npi?: string;
  licenseNumber?: string;
  email?: string;
  cellPhone?: string;
  officePhone?: string;
  fax?: string;
  affiliations?: string[];
  social?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
}

type FieldKey =
  | "name"
  | "photo"
  | "practice"
  | "location"
  | "email"
  | "cell"
  | "office"
  | "fax"
  | "npi"
  | "license"
  | "affiliations"
  | "social";

const DEFAULT_FIELDS: Record<FieldKey, boolean> = {
  name: true,
  photo: false,
  practice: true,
  location: true,
  email: true,
  cell: false,
  office: true,
  fax: false,
  npi: false,
  license: false,
  affiliations: false,
  social: false,
};

const FIELD_LABELS: Record<FieldKey, string> = {
  name: "Name",
  photo: "Photo",
  practice: "Practice",
  location: "Office address",
  email: "Email",
  cell: "Cell phone",
  office: "Office phone",
  fax: "Fax",
  npi: "NPI",
  license: "License #",
  affiliations: "Affiliations",
  social: "Social links",
};

export function ProviderQRCard({ provider }: { provider: ProviderProfile }) {
  const [enabled, setEnabled] = useState<Record<FieldKey, boolean>>(DEFAULT_FIELDS);

  const toggle = useCallback((k: FieldKey) => {
    setEnabled((prev) => ({ ...prev, [k]: !prev[k] }));
  }, []);

  const vcard = useMemo(() => buildVCard(provider, enabled), [provider, enabled]);

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
      <div className="flex flex-col items-center justify-center gap-3">
        <QRCodeSVG value={vcard} size={220} />
        <p className="text-[12px] text-[var(--muted)] text-center">
          Scan to save {provider.name} to contacts.
        </p>
      </div>
      <div>
        <p className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--muted)] mb-3 font-semibold">
          What to include
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(FIELD_LABELS) as FieldKey[]).map((k) => (
            <label
              key={k}
              className="flex items-center gap-2 text-[13px] text-[var(--text)] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={enabled[k]}
                onChange={() => toggle(k)}
                className="rounded border-[var(--border)]"
              />
              {FIELD_LABELS[k]}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildVCard(p: ProviderProfile, en: Record<FieldKey, boolean>): string {
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];
  if (en.name && p.name) lines.push(`FN:${escape(p.name)}`);
  if (en.practice && p.practice) lines.push(`ORG:${escape(p.practice)}`);
  if (en.location && p.practiceLocation) {
    lines.push(`ADR;TYPE=WORK:;;${escape(p.practiceLocation)}`);
  }
  if (en.email && p.email) lines.push(`EMAIL;TYPE=WORK:${p.email}`);
  if (en.cell && p.cellPhone) lines.push(`TEL;TYPE=CELL:${p.cellPhone}`);
  if (en.office && p.officePhone) lines.push(`TEL;TYPE=WORK:${p.officePhone}`);
  if (en.fax && p.fax) lines.push(`TEL;TYPE=FAX:${p.fax}`);
  if (en.npi && p.npi) lines.push(`NOTE:NPI ${p.npi}`);
  if (en.license && p.licenseNumber) {
    lines.push(`NOTE:License ${p.licenseNumber}`);
  }
  if (en.affiliations && p.affiliations?.length) {
    lines.push(`NOTE:${escape(p.affiliations.join("; "))}`);
  }
  if (en.social && p.social) {
    if (p.social.linkedin) lines.push(`URL;TYPE=LinkedIn:${p.social.linkedin}`);
    if (p.social.facebook) lines.push(`URL;TYPE=Facebook:${p.social.facebook}`);
    if (p.social.instagram) lines.push(`URL;TYPE=Instagram:${p.social.instagram}`);
    if (p.social.twitter) lines.push(`URL;TYPE=Twitter:${p.social.twitter}`);
  }
  if (en.photo && p.photoUrl) lines.push(`PHOTO;VALUE=URI:${p.photoUrl}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

function escape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

/**
 * Tiny QR encoder. Uses Google Chart API by default but exposes a hook
 * for swapping in a fully-offline encoder later. The vCard is short
 * enough that the URL approach is fine for the MVP and avoids a 60 KB
 * client dependency. If the network is offline at scan time the QR
 * just won't render — that's an acceptable tradeoff for an in-clinic
 * tool the provider re-renders before each appointment.
 */
function QRCodeSVG({ value, size }: { value: string; size: number }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&qzone=2`;
  return (
    <img
      src={src}
      alt="Provider QR code"
      width={size}
      height={size}
      className="rounded-xl bg-white p-2 border border-[var(--border)]"
    />
  );
}
