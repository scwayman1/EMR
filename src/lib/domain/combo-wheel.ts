// Cannabis Combo Wheel — domain layer.
// Single source of truth for compound data consumed by ComboWheel.tsx.
// Backed by the EducationCompound table (see prisma/schema.prisma).

import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import type {
  EducationCompound as DbCompound,
  CompoundType as DbCompoundType,
  CompoundEvidenceLevel as DbEvidenceLevel,
} from "@prisma/client";

export type CompoundType = "cannabinoid" | "terpene";
export type CompoundEvidence = "strong" | "moderate" | "emerging";

export type ComboWheelCompound = {
  id: string;
  name: string;
  type: CompoundType;
  color: string;
  evidence: CompoundEvidence;
  description: string;
  symptoms: string[];
  benefits: string[];
  risks: string[];
};

function mapType(t: DbCompoundType): CompoundType {
  return t === "cannabinoid" ? "cannabinoid" : "terpene";
}

function mapEvidence(e: DbEvidenceLevel): CompoundEvidence {
  return e;
}

function mapRow(row: DbCompound): ComboWheelCompound {
  return {
    id: row.id,
    name: row.name,
    type: mapType(row.type),
    color: row.color,
    evidence: mapEvidence(row.evidence),
    description: row.description,
    symptoms: row.symptoms,
    benefits: row.benefits,
    risks: row.risks,
  };
}

// Request-scoped cache: dedupes the query across multiple components on a
// single render pass. Combined with `unstable_cache` below it gives both
// per-request and cross-request caching.
export const getComboWheelCompounds = cache(
  async (): Promise<ComboWheelCompound[]> => {
    const rows = await prisma.educationCompound.findMany({
      where: { active: true },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
    });
    return rows.map(mapRow);
  },
);
