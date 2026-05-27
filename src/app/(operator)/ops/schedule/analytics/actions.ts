"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

/**
 * EMR-215 — appointment-level CSV export.
 *
 * Returns the last 90 days of appointments scoped to the current org. The
 * CSV is shaped for Excel/Sheets/Pandas: ISO timestamps, a stable column
 * order, and patient names quoted to handle commas in legal names.
 */
export async function exportSchedulingCsvAction(): Promise<
  { ok: true; csv: string; fileName: string } | { ok: false; error: string }
> {
  const user = await requireUser();
  const orgId = user.organizationId;
  if (!orgId) return { ok: false, error: "No organization on session." };

  const ninetyAgo = new Date();
  ninetyAgo.setDate(ninetyAgo.getDate() - 90);

  const rows = await prisma.appointment.findMany({
    where: {
      patient: { organizationId: orgId },
      startAt: { gte: ninetyAgo },
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, state: true } },
      provider: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: { startAt: "asc" },
  });

  const header = [
    "appointment_id",
    "start_at",
    "end_at",
    "duration_minutes",
    "status",
    "modality",
    "provider_id",
    "provider_name",
    "patient_id",
    "patient_name",
    "patient_state",
    "booked_at",
    "lead_time_hours",
  ];

  const lines: string[] = [header.join(",")];
  for (const r of rows) {
    const durationMin = Math.round((r.endAt.getTime() - r.startAt.getTime()) / 60_000);
    const leadHours =
      Math.round(((r.startAt.getTime() - r.createdAt.getTime()) / 3_600_000) * 10) / 10;
    const providerName = r.provider?.user
      ? `${r.provider.user.firstName} ${r.provider.user.lastName}`.trim()
      : "";
    const fields = [
      r.id,
      r.startAt.toISOString(),
      r.endAt.toISOString(),
      durationMin,
      r.status,
      r.modality,
      r.providerId ?? "",
      csvField(providerName),
      r.patient.id,
      csvField(`${r.patient.firstName} ${r.patient.lastName}`.trim()),
      r.patient.state ?? "",
      r.createdAt.toISOString(),
      leadHours,
    ];
    lines.push(fields.join(","));
  }

  const csv = lines.join("\n") + "\n";
  const fileName = `scheduling-${new Date().toISOString().slice(0, 10)}.csv`;
  return { ok: true, csv, fileName };
}

function csvField(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
