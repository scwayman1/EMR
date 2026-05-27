// EMR-151 — Supplement wheel data fetcher (server-only).
//
// Pulled out of `supplement-wheel.ts` so the client component can import
// types and pure helpers without dragging the Prisma client into the
// browser bundle.

import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import type {
  SupplementCompound as DbSupplement,
  SupplementCompoundEvidence as DbEvidence,
} from "@prisma/client";
import {
  BUILTIN_SUPPLEMENTS,
  type SupplementCompoundView,
  type SupplementEvidence,
} from "./supplement-wheel";

function mapEvidence(e: DbEvidence): SupplementEvidence {
  return e;
}

function mapRow(row: DbSupplement): SupplementCompoundView {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    color: row.color,
    evidence: mapEvidence(row.evidence),
    description: row.description,
    symptoms: row.symptoms,
    benefits: row.benefits,
    risks: row.risks,
    cannabisInteraction: row.cannabisInteraction,
  };
}

export const getSupplementCompounds = cache(
  async (): Promise<SupplementCompoundView[]> => {
    try {
      const rows = await prisma.supplementCompound.findMany({
        where: { active: true },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      });
      return rows.map(mapRow);
    } catch {
      // DB unreachable (e.g. local dev without seed) — return the
      // built-in fallback so the wheel still renders.
      return BUILTIN_SUPPLEMENTS;
    }
  },
);
