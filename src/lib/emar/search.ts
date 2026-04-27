// EMR-077 — Drug catalog search.
//
// Pulled out of the Prisma layer so it can be reused by the prescribing
// UI, the AI prior-auth agent, and the EMAR administration form without
// each one re-implementing the matching rules.

import {
  PHARMACEUTICAL_DRUGS,
  PHARMACEUTICAL_FORMULATIONS,
} from "./catalog";
import type {
  EmarSearchResult,
  PharmaceuticalDrug,
  PharmaceuticalFormulation,
} from "./types";

const MAX_RESULTS = 25;

export function searchEmarDrugs(query: string): EmarSearchResult {
  const q = query.trim().toLowerCase();
  if (!q) {
    return {
      query,
      hits: PHARMACEUTICAL_DRUGS.slice(0, 10).map(toHit),
      truncated: PHARMACEUTICAL_DRUGS.length > 10,
    };
  }

  const matches: PharmaceuticalDrug[] = PHARMACEUTICAL_DRUGS.filter((d) => {
    const hay = [
      d.name,
      d.genericName ?? "",
      d.drugClass,
      ...d.brandNames,
      ...d.indications,
    ]
      .join("|")
      .toLowerCase();
    return hay.includes(q);
  });

  return {
    query,
    hits: matches.slice(0, MAX_RESULTS).map(toHit),
    truncated: matches.length > MAX_RESULTS,
  };
}

function toHit(drug: PharmaceuticalDrug): EmarSearchResult["hits"][number] {
  return {
    drug,
    formulations: PHARMACEUTICAL_FORMULATIONS.filter(
      (f) => f.drugId === drug.id,
    ),
  };
}

export function getFormulation(
  formulationId: string,
): { drug: PharmaceuticalDrug; formulation: PharmaceuticalFormulation } | null {
  const formulation = PHARMACEUTICAL_FORMULATIONS.find(
    (f) => f.id === formulationId,
  );
  if (!formulation) return null;
  const drug = PHARMACEUTICAL_DRUGS.find((d) => d.id === formulation.drugId);
  if (!drug) return null;
  return { drug, formulation };
}
