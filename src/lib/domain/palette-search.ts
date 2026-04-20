"use server";

/**
 * Server-side patient lookup for the ⌘K command palette.
 *
 * The palette debounces user keystrokes to ~200ms and calls
 * `searchPatients(query)` once the query is at least 3 characters and doesn't
 * exactly match a navigation/action command. We always scope to the caller's
 * organization — never trust an organizationId passed from the client.
 *
 * Result shape mirrors the `PatientCommand` type in
 * `src/components/ui/command-palette.tsx`. The two are kept in lock-step
 * because patient rows render in their own group in the palette UI.
 */

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

export interface PatientSearchResult {
  id: string;
  patientId: string;
  label: string;
  description: string;
}

/**
 * Lightweight age-from-DOB calculation. Inlined to avoid a date-library
 * dependency. Returns null if dob is missing or unparseable.
 */
function ageFromDob(dob: Date | null): number | null {
  if (!dob) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

function shortDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Fuzzy-search patients by first/last name. Always scoped to the current
 * user's organization. Returns at most 5 hits.
 *
 * The query parameter is intentionally raw; we sanitize for ILIKE wildcards
 * inside this function. Empty / under-3-character queries return [] to keep
 * the request cost trivial.
 */
export async function searchPatients(
  query: string,
): Promise<PatientSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const user = await requireUser();
  if (!user.organizationId) return [];

  // Strip ILIKE wildcards from user input. Prisma's `contains` already does
  // safe escaping when using the query API, so this is belt-and-suspenders.
  const safe = trimmed.replace(/[%_]/g, "");

  // Split on whitespace so "maya rey" matches first/last in either order.
  const tokens = safe.split(/\s+/).filter(Boolean);

  // Build an AND of OR conditions: every token must hit firstName, lastName,
  // or email somewhere.
  const where = {
    organizationId: user.organizationId,
    deletedAt: null,
    AND: tokens.map((tok) => ({
      OR: [
        { firstName: { contains: tok, mode: "insensitive" as const } },
        { lastName: { contains: tok, mode: "insensitive" as const } },
        { email: { contains: tok, mode: "insensitive" as const } },
      ],
    })),
  };

  const rows = await prisma.patient.findMany({
    where,
    take: 5,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      _count: { select: { appointments: true } },
      appointments: {
        orderBy: { startAt: "desc" },
        take: 1,
        select: { startAt: true },
      },
    },
  });

  return rows.map((p) => {
    const age = ageFromDob(p.dateOfBirth);
    const label = age
      ? `${p.firstName} ${p.lastName} · ${age}y`
      : `${p.firstName} ${p.lastName}`;
    const lastVisit = p.appointments[0]?.startAt ?? null;
    const description = lastVisit
      ? `Last visit ${shortDate(lastVisit)} · ${p._count.appointments} visit${p._count.appointments === 1 ? "" : "s"}`
      : `${p._count.appointments} visit${p._count.appointments === 1 ? "" : "s"} on file`;
    return {
      id: `patient-${p.id}`,
      patientId: p.id,
      label,
      description,
    };
  });
}
