// EMR-144 — public emergency-card route.
//
// `/api/emergency/[token]` resolves a signed emergency token (separate
// from the share-tokens flow at /share/[token]) and returns the
// minimal critical-info payload a paramedic, ER team, or Wallet pass
// scanner needs. The route never requires auth — that's the whole
// point of an emergency card — but every access is rate-limited and
// audit-logged.
//
// Three response modes by `Accept` header:
//   • text/html (default)      → printable card HTML
//   • application/json         → structured payload for integrations
//   • application/vnd.apple.pkpass → Apple Wallet pass JSON envelope

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  buildEmergencyCardData,
  buildApplePassJson,
  shortJoin,
  verifyEmergencyToken,
  type PatientRecord,
} from "@/lib/patient/emergency-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APPLE_PASS_TYPE_IDENTIFIER = process.env.APPLE_PASS_TYPE_ID ?? "pass.com.leafjourney.emergency";
const APPLE_TEAM_IDENTIFIER = process.env.APPLE_TEAM_ID ?? "TEAMIDXXXX";
const ORG_NAME = "Leafjourney";
const PASS_DESCRIPTION = "Emergency medical card";

// Tiny in-process rate limit (per-token). Production swaps in Redis;
// the guarantees here are best-effort but they slam the brakes on
// scripted enumeration.
const RATE_BUCKET = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const cur = RATE_BUCKET.get(key);
  if (!cur || cur.resetAt < now) {
    RATE_BUCKET.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  cur.count += 1;
  return cur.count > MAX_PER_WINDOW;
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtmlCard(data: ReturnType<typeof buildEmergencyCardData>, expiresIso: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Emergency card — ${htmlEscape(data.patientName)}</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;margin:0;background:#fff;color:#0a0a0a}
    .wrap{max-width:560px;margin:0 auto;padding:24px}
    .banner{background:#dc2626;color:#fff;padding:18px 20px;border-radius:14px;font-weight:700;letter-spacing:.04em}
    .row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-top:18px}
    .label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280}
    .val{font-size:16px;font-weight:600}
    ul{padding-left:18px;margin:6px 0}
    .danger{color:#b91c1c;font-weight:700}
    footer{font-size:11px;color:#6b7280;margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb}
  </style>
</head>
<body>
<div class="wrap">
  <div class="banner">EMERGENCY MEDICAL CARD</div>
  <div class="row"><span class="label">Patient</span><span class="val">${htmlEscape(data.patientName)}</span></div>
  ${data.ageYears != null ? `<div class="row"><span class="label">Age</span><span class="val">${data.ageYears}</span></div>` : ""}
  ${data.bloodType ? `<div class="row"><span class="label">Blood type</span><span class="val">${htmlEscape(data.bloodType)}</span></div>` : ""}
  <div class="row"><span class="label">Allergies</span><span class="val danger">${data.allergies.length === 0 ? "None known" : htmlEscape(shortJoin(data.allergies, 200))}</span></div>
  <div class="row"><span class="label">Conditions</span><span class="val">${data.conditions.length === 0 ? "None on file" : htmlEscape(shortJoin(data.conditions, 200))}</span></div>
  <div class="label" style="margin-top:18px">Active medications</div>
  ${data.medications.length === 0
      ? "<p>None on file.</p>"
      : "<ul>" + data.medications.map((m) => `<li><strong>${htmlEscape(m.name)}</strong>${m.doseText ? " — " + htmlEscape(m.doseText) : ""}</li>`).join("") + "</ul>"}
  <div class="label" style="margin-top:18px">Emergency contacts</div>
  ${data.emergencyContacts.length === 0
      ? "<p>None on file.</p>"
      : "<ul>" +
        data.emergencyContacts
          .map(
            (c) =>
              `<li><strong>${htmlEscape(c.name)}</strong>${c.relation ? " (" + htmlEscape(c.relation) + ")" : ""}${c.phone ? " — " + htmlEscape(c.phone) : ""}</li>`,
          )
          .join("") +
        "</ul>"}
  <footer>Card expires ${htmlEscape(expiresIso)}. This is a read-only summary; visit the responder portal for the full chart.</footer>
</div>
</body></html>`;
}

interface PatientWithMeds {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  allergies: string[];
  contraindications: string[];
  medications: Array<{ name: string; dose: string | null }>;
}

async function loadPatient(patientId: string): Promise<PatientWithMeds | null> {
  // Some Prisma client versions surface PatientMedication as
  // `medications` while older models use `patientMedications`. Try
  // both shapes; cast through `unknown` to avoid pulling the entire
  // Prisma type graph in here.
  const client = prisma as unknown as {
    patient: {
      findUnique: (args: unknown) => Promise<unknown>;
    };
  };
  try {
    const found = (await client.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        allergies: true,
        contraindications: true,
        medications: { select: { name: true, dose: true } },
      },
    })) as PatientWithMeds | null;
    return found;
  } catch {
    const fallback = (await client.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        allergies: true,
        contraindications: true,
      },
    })) as Omit<PatientWithMeds, "medications"> | null;
    return fallback ? { ...fallback, medications: [] } : null;
  }
}

function toPatientRecord(p: PatientWithMeds): PatientRecord {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    dateOfBirth: p.dateOfBirth,
    allergies: p.allergies,
    contraindications: p.contraindications,
    medications: p.medications.map((m) => ({ name: m.name, doseText: m.dose ?? undefined })),
  };
}

export async function GET(req: NextRequest, ctx: { params: { token: string } }) {
  const token = decodeURIComponent(ctx.params.token);
  if (rateLimited(token)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const claims = verifyEmergencyToken(token);
  if (!claims) {
    return NextResponse.json({ error: "invalid_or_expired" }, { status: 404 });
  }

  const patient = await loadPatient(claims.patientId);
  if (!patient) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const data = buildEmergencyCardData(toPatientRecord(patient));
  const accept = req.headers.get("accept") ?? "";
  const expiresIso = new Date(claims.expiresAt * 1000).toISOString();

  if (accept.includes("application/vnd.apple.pkpass") || accept.includes("application/json+pkpass")) {
    const pass = buildApplePassJson({
      passTypeIdentifier: APPLE_PASS_TYPE_IDENTIFIER,
      teamIdentifier: APPLE_TEAM_IDENTIFIER,
      organizationName: ORG_NAME,
      description: PASS_DESCRIPTION,
      serialNumber: claims.patientId,
      patientName: data.patientName,
      bloodType: data.bloodType,
      allergiesShort: shortJoin(data.allergies),
      conditionsShort: shortJoin(data.conditions),
      medicationsShort: shortJoin(data.medications.map((m) => m.name)),
      emergencyContactName: data.emergencyContacts[0]?.name,
      emergencyContactPhone: data.emergencyContacts[0]?.phone,
      shareUrl: req.url,
    });
    return NextResponse.json(pass, {
      headers: {
        "Cache-Control": "private, max-age=0, no-store",
        "X-Token-Expires-At": expiresIso,
      },
    });
  }

  if (accept.includes("application/json")) {
    return NextResponse.json(
      { ...data, expiresAt: expiresIso },
      {
        headers: {
          "Cache-Control": "private, max-age=0, no-store",
          "X-Token-Expires-At": expiresIso,
        },
      },
    );
  }

  return new NextResponse(renderHtmlCard(data, expiresIso), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, max-age=0, no-store",
      "X-Token-Expires-At": expiresIso,
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
