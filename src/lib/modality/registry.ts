/**
 * Modality Registry — EMR-410
 *
 * The modality registry is the canonical capability map for LeafJourney.
 * Every clinical or commerce capability that can be turned on/off per practice
 * is a modality. This registry hardcodes the metadata + dependency graph; the
 * per-practice on/off state lives on PracticeConfiguration.enabledModalities /
 * disabledModalities and is read via ./server.ts.
 *
 * Architecture invariants (HARD constraints — see CLAUDE.md / Epic 2):
 *   - LeafJourney is specialty-adaptive, NOT cannabis-first. The dependency
 *     graph below treats cannabis-medicine as one modality among many. The
 *     ONLY hard-wired dependency in v1 is: commerce-leafmart REQUIRES
 *     cannabis-medicine (because the v1 Leafmart catalog is exclusively
 *     cannabis SKUs — once Leafmart carries non-cannabis SKUs the requirement
 *     is removed and replaced with per-SKU modality tagging).
 *   - Adding a new modality means: add the slug to REGISTERED_MODALITIES in
 *     ../specialty-templates/manifest-schema.ts AND add a META entry below.
 *     The boot-time assertion on REGISTERED_MODALITIES keeps these in sync.
 *   - The registry never branches on a specific slug at runtime. Code that
 *     wants to gate on cannabis-medicine uses <ModalityGate /> or
 *     isModalityEnabled() — never `if (slug === 'cannabis-medicine')`.
 */

import {
  REGISTERED_MODALITIES,
  type RegisteredModality,
} from "@/lib/specialty-templates/manifest-schema";

/** A modality id is one of the registered slugs. */
export type ModalityId = RegisteredModality;

/**
 * Surfaces a modality may toggle when on/off. Used by EMR-411 (shell render),
 * EMR-423 (toggle wizard), and EMR-445/447 (mission-control + portal cards) to
 * decide which slots to render. New surfaces are added here and consumed
 * elsewhere — the registry is the single source of truth.
 */
export type ModalitySurface =
  | "physician-nav"
  | "physician-mission-control"
  | "physician-chart"
  | "physician-cds"
  | "patient-portal"
  | "patient-education"
  | "patient-commerce"
  | "intake-questions"
  | "shop";

export type ModalityMeta = {
  id: ModalityId;
  label: string;
  description: string;
  /** Which surfaces this modality affects when toggled. */
  surfaces: ModalitySurface[];
  /** Other modalities required by this one (acyclic). */
  requires: ModalityId[];
  /** Modalities that depend on this one (computed inverse of requires). */
  dependents: ModalityId[];
};

/**
 * Authored metadata. `dependents` is filled in below by deriving it from
 * `requires` so author-time edits cannot drift between the two directions.
 */
type AuthoredMeta = Omit<ModalityMeta, "dependents">;

const AUTHORED: Record<ModalityId, AuthoredMeta> = {
  medications: {
    id: "medications",
    label: "Medications",
    description:
      "General medication list, prescribing, refill management, and " +
      "med reconciliation. Required by most longitudinal care models.",
    surfaces: [
      "physician-nav",
      "physician-mission-control",
      "physician-chart",
      "physician-cds",
      "patient-portal",
      "intake-questions",
    ],
    requires: [],
  },
  "pain-medications": {
    id: "pain-medications",
    label: "Pain Medications",
    description:
      "Pain-specific medication workflows: opioid agreements, PDMP " +
      "checks, controlled-substance refill cadence, and risk scoring.",
    surfaces: [
      "physician-nav",
      "physician-mission-control",
      "physician-chart",
      "physician-cds",
      "patient-portal",
      "intake-questions",
    ],
    requires: [],
  },
  labs: {
    id: "labs",
    label: "Labs",
    description:
      "Lab orders, result review, abnormal-flag follow-up, and patient " +
      "lab portal cards.",
    surfaces: [
      "physician-nav",
      "physician-mission-control",
      "physician-chart",
      "patient-portal",
    ],
    requires: [],
  },
  imaging: {
    id: "imaging",
    label: "Imaging",
    description:
      "Imaging orders, radiology report review, and image-driven " +
      "procedure planning.",
    surfaces: [
      "physician-nav",
      "physician-mission-control",
      "physician-chart",
    ],
    requires: [],
  },
  referrals: {
    id: "referrals",
    label: "Referrals",
    description:
      "Outbound referrals to specialists, status tracking, and " +
      "loop-closure follow-up.",
    surfaces: [
      "physician-nav",
      "physician-mission-control",
      "physician-chart",
    ],
    requires: [],
  },
  procedures: {
    id: "procedures",
    label: "Procedures",
    description:
      "Procedure scheduling, procedure notes, and post-procedure " +
      "follow-up workflows.",
    surfaces: [
      "physician-nav",
      "physician-mission-control",
      "physician-chart",
      "patient-portal",
    ],
    requires: [],
  },
  lifestyle: {
    id: "lifestyle",
    label: "Lifestyle",
    description:
      "Lifestyle modalities: nutrition, sleep, stress, exercise. " +
      "Patient-facing tracking and clinician guidance content.",
    surfaces: [
      "physician-chart",
      "patient-portal",
      "patient-education",
      "intake-questions",
    ],
    requires: [],
  },
  "physical-therapy": {
    id: "physical-therapy",
    label: "Physical Therapy",
    description:
      "PT referral workflows, exercise plan delivery, and progress " +
      "tracking.",
    surfaces: [
      "physician-nav",
      "physician-chart",
      "patient-portal",
    ],
    requires: [],
  },
  "functional-pain": {
    id: "functional-pain",
    label: "Functional Pain",
    description:
      "Functional outcome measures specific to chronic pain: PEG, ODI, " +
      "Roland-Morris. Drives the pain-mgmt patient portal cards.",
    surfaces: [
      "physician-mission-control",
      "physician-chart",
      "patient-portal",
      "intake-questions",
    ],
    requires: [],
  },
  "patient-reported-outcomes": {
    id: "patient-reported-outcomes",
    label: "Patient-Reported Outcomes",
    description:
      "Generic PROM collection: per-visit and longitudinal scales " +
      "(emoji + 1-10) feeding the research/efficacy data layer.",
    surfaces: [
      "physician-mission-control",
      "physician-chart",
      "patient-portal",
      "intake-questions",
    ],
    requires: [],
  },
  "cannabis-medicine": {
    id: "cannabis-medicine",
    label: "Cannabis Medicine",
    description:
      "Cannabis recommendations, certifications, dosing titration, " +
      "post-dose check-ins, and the cannabis-specific charting templates. " +
      "Disabled by default in non-cannabis specialties — practices opt in " +
      "explicitly via the modality toggle.",
    surfaces: [
      "physician-nav",
      "physician-mission-control",
      "physician-chart",
      "physician-cds",
      "patient-portal",
      "patient-education",
      "intake-questions",
    ],
    requires: [],
  },
  "commerce-leafmart": {
    id: "commerce-leafmart",
    label: "Leafmart Commerce",
    description:
      "Patient-facing storefront integration: product catalog, cart, " +
      "checkout, and recommendation → order linkage. v1 catalog is " +
      "cannabis-only, so this modality requires cannabis-medicine.",
    surfaces: [
      "patient-portal",
      "patient-commerce",
      "shop",
    ],
    // v1 invariant: Leafmart SKUs are cannabis. Until the catalog carries
    // non-cannabis goods we hard-require cannabis-medicine so a practice
    // can't accidentally enable a storefront they can't legally fulfill.
    requires: ["cannabis-medicine"],
  },
  psilocybin: {
    id: "psilocybin",
    label: "Psilocybin",
    description: "Psilocybin protocols and therapy tracking.",
    surfaces: ["physician-chart", "patient-portal"],
    requires: [],
  },
  "integration-therapy": {
    id: "integration-therapy",
    label: "Integration Therapy",
    description: "Integration therapy for post-psychedelic processing.",
    surfaces: ["physician-chart", "patient-portal"],
    requires: [],
  },
  "veterinary-medicine": {
    id: "veterinary-medicine",
    label: "Veterinary Medicine",
    description: "Animal care and veterinary charting workflows.",
    surfaces: ["physician-chart", "patient-portal"],
    requires: [],
  },
  "human-pharmacology": {
    id: "human-pharmacology",
    label: "Human Pharmacology",
    description: "Standard human pharmacology protocols.",
    surfaces: ["physician-chart"],
    requires: [],
  },
};

/**
 * Compute the inverse `dependents` map at module-init so callers can ask
 * "what cascades off if I disable cannabis-medicine?" in O(1).
 */
function buildMeta(): Record<ModalityId, ModalityMeta> {
  // Verify AUTHORED covers every registered modality. This is the boot-time
  // sync check that keeps manifest-schema and the modality registry from
  // drifting silently.
  for (const id of REGISTERED_MODALITIES) {
    if (!(id in AUTHORED)) {
      throw new Error(
        `[modality/registry] missing META entry for "${id}". Add it to ` +
          `AUTHORED in src/lib/modality/registry.ts.`,
      );
    }
  }
  for (const key of Object.keys(AUTHORED)) {
    if (!(REGISTERED_MODALITIES as readonly string[]).includes(key)) {
      throw new Error(
        `[modality/registry] AUTHORED contains "${key}" which is not in ` +
          `REGISTERED_MODALITIES. Either drop the entry or add the slug to ` +
          `manifest-schema.ts.`,
      );
    }
  }

  // Every `requires` edge must point at a known modality.
  for (const meta of Object.values(AUTHORED)) {
    for (const dep of meta.requires) {
      if (!(dep in AUTHORED)) {
        throw new Error(
          `[modality/registry] "${meta.id}" requires unknown modality "${dep}".`,
        );
      }
    }
  }

  // Build inverse map: dep → [things that require dep].
  const dependents: Record<ModalityId, ModalityId[]> = Object.fromEntries(
    REGISTERED_MODALITIES.map((id) => [id, [] as ModalityId[]]),
  ) as Record<ModalityId, ModalityId[]>;

  for (const meta of Object.values(AUTHORED)) {
    for (const dep of meta.requires) {
      dependents[dep].push(meta.id);
    }
  }

  // Acyclicity check (DFS). With v1 having a single edge this is a formality,
  // but it's cheap and prevents future authors from introducing a cycle.
  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color: Record<ModalityId, number> = Object.fromEntries(
    REGISTERED_MODALITIES.map((id) => [id, WHITE]),
  ) as Record<ModalityId, number>;

  function visit(node: ModalityId, stack: ModalityId[]): void {
    if (color[node] === GRAY) {
      throw new Error(
        `[modality/registry] dependency cycle: ${[...stack, node].join(" → ")}`,
      );
    }
    if (color[node] === BLACK) return;
    color[node] = GRAY;
    for (const dep of AUTHORED[node].requires) {
      visit(dep, [...stack, node]);
    }
    color[node] = BLACK;
  }
  for (const id of REGISTERED_MODALITIES) visit(id, []);

  const out: Record<ModalityId, ModalityMeta> = {} as Record<
    ModalityId,
    ModalityMeta
  >;
  for (const id of REGISTERED_MODALITIES) {
    out[id] = { ...AUTHORED[id], dependents: [...dependents[id]].sort() };
  }
  return out;
}

export const MODALITY_META: Record<ModalityId, ModalityMeta> = buildMeta();

/** Type guard — checks at runtime that `value` is a registered modality slug. */
export function isModalityId(value: unknown): value is ModalityId {
  return (
    typeof value === "string" &&
    (REGISTERED_MODALITIES as readonly string[]).includes(value)
  );
}

/** All registered modality ids in deterministic order. */
export function listModalities(): ModalityMeta[] {
  return REGISTERED_MODALITIES.map((id) => MODALITY_META[id]);
}
