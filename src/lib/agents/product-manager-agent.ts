import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

// ---------------------------------------------------------------
// Linear card schema — shaped to paste directly into Linear without
// massaging. We keep the field set small and practical.
// ---------------------------------------------------------------

export const Priority = z.enum(["urgent", "high", "medium", "low", "no_priority"]);
export type Priority = z.infer<typeof Priority>;

export const LinearCardSchema = z.object({
  title: z.string().min(4).max(140),
  description: z.string(),
  labels: z.array(z.string()).default([]),
  priority: Priority.default("medium"),
  estimate: z.enum(["xs", "s", "m", "l", "xl"]).optional(),
  acceptanceCriteria: z.array(z.string()).default([]),
  parentEpicSlug: z.string().optional(),
  dependsOn: z.array(z.string()).default([]),
});
/** Parsed card — every defaulted field is present. Use for rendering. */
export type LinearCard = z.infer<typeof LinearCardSchema>;
/** Card-as-authored — defaulted fields are optional. Use inside themes. */
export type LinearCardInput = z.input<typeof LinearCardSchema>;

// ---------------------------------------------------------------
// Decomposer — pure function, exported so we can run it outside the
// agent harness (e.g. from a script, a test, or ad-hoc from the CLI).
// ---------------------------------------------------------------

export interface DecomposeInput {
  rawText: string;
  source: string;
  author: string;
}

export interface DecomposeOutput {
  epicSlug: string;
  epicTitle: string;
  summary: string;
  cards: LinearCard[];
  openQuestions: string[];
}

/** Very light NLP: lowercase + strip punctuation-ish for keyword matching. */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** A theme matcher has a name, a predicate, and a card generator. */
interface Theme {
  name: string;
  matches(normText: string, rawText: string): boolean;
  cards(input: DecomposeInput, epicSlug: string): LinearCardInput[];
}

// ---------------------------------------------------------------
// Themes
//
// Each theme is a small, hand-written slice of product judgment.
// Mallik V1 is intentionally rule-based — deterministic, auditable,
// and easy to extend. V2 will plug in a real model for long-tail
// prompts, but the rule-based core stays as a safety floor.
// ---------------------------------------------------------------

const THEMES: Theme[] = [
  // ---- billing & insurance ----
  {
    name: "billing-insurance-module",
    matches: (t) =>
      (t.includes("billing") || t.includes("insurance")) &&
      (t.includes("module") || t.includes("system") || t.includes("coverage")),
    cards: (_input, epic) => [
      {
        title: "Spike: scope the billing & insurance module",
        description:
          "Document the data model boundary between clinical (encounters, prescriptions) and financial (payers, coverage, claims). Decide what lives in the EMR vs. what integrates with a downstream clearinghouse.",
        labels: ["billing", "spike", "architecture"],
        priority: "high",
        estimate: "s",
        acceptanceCriteria: [
          "One-pager in docs/ outlining the proposed module boundary",
          "List of Prisma models we will add (Payer, CoveragePlan, Claim, ...)",
          "Explicit out-of-scope list (e.g. claim adjudication, ERA ingestion)",
        ],
        parentEpicSlug: epic,
      },
      {
        title: "Add Payer + CoveragePlan + PatientCoverage Prisma models",
        description:
          "Baseline insurance data. A Payer is an insurer (e.g. Blue Cross). A CoveragePlan is one specific plan a Payer offers. A PatientCoverage links a Patient to one CoveragePlan with effective dates and member ID.",
        labels: ["billing", "prisma", "backend"],
        priority: "high",
        estimate: "m",
        acceptanceCriteria: [
          "Three models added with appropriate indices",
          "Soft delete via deletedAt where patient-owned",
          "Seed data for at least two demo payers",
        ],
        parentEpicSlug: epic,
        dependsOn: ["Spike: scope the billing & insurance module"],
      },
    ],
  },

  // ---- formulary tiers ----
  {
    name: "formulary-tier-system",
    matches: (t) =>
      (t.includes("tier") || t.includes("tiers")) &&
      (t.includes("cannabis") || t.includes("medication") || t.includes("formulary") || t.includes("product")),
    cards: (_input, epic) => [
      {
        title: "Define the Cannabis Formulary tier taxonomy",
        description:
          "Decide the tier shape. Proposal: Tier 1 (preferred, covered), Tier 2 (covered with step therapy), Tier 3 (requires prior authorization), Tier 4 (not covered / self-pay). Include rationale and examples per tier.",
        labels: ["formulary", "product", "spec"],
        priority: "high",
        estimate: "s",
        acceptanceCriteria: [
          "docs/formulary/tier-taxonomy.md with the four tiers and examples",
          "Signed off by Dr. Patel before we build data model",
        ],
        parentEpicSlug: epic,
      },
      {
        title: "Add Formulary + FormularyEntry Prisma models",
        description:
          "A Formulary belongs to a CoveragePlan. A FormularyEntry maps a Product to a FormularyTier with optional step-therapy predecessor and PA-required flag.",
        labels: ["formulary", "prisma", "backend"],
        priority: "high",
        estimate: "m",
        acceptanceCriteria: [
          "FormularyTier enum: tier_1 | tier_2 | tier_3 | tier_4 | not_listed",
          "FormularyEntry.priorAuthRequired: Boolean",
          "FormularyEntry.stepTherapyAfterProductId: String? — the product the patient must fail first",
          "Unique index on (formularyId, productId)",
        ],
        parentEpicSlug: epic,
        dependsOn: ["Define the Cannabis Formulary tier taxonomy"],
      },
      {
        title: "Coverage lookup API: given Patient + Product, return tier + actions",
        description:
          "Single resolver used by the prescribing UI. Output includes coverage tier, whether PA is required, whether step therapy applies, and suggested alternatives.",
        labels: ["formulary", "api", "backend"],
        priority: "high",
        estimate: "m",
        acceptanceCriteria: [
          "Function: resolveCoverage({ patientId, productId }) → CoverageResolution",
          "Handles missing patient coverage (returns tier_not_listed, reason)",
          "Unit tested against a seeded demo formulary",
        ],
        parentEpicSlug: epic,
        dependsOn: ["Add Formulary + FormularyEntry Prisma models"],
      },
    ],
  },

  // ---- prior authorization ----
  {
    name: "prior-authorization",
    matches: (t) => t.includes("prior authorization") || t.includes("prior auth") || /\bpa\b/.test(t),
    cards: (_input, epic) => [
      {
        title: "Prior authorization request workflow",
        description:
          "When a prescribed product is tier_3 (PA required), create a PriorAuthRequest with status, rationale, clinical attachments, and submitter. Surface it in /ops mission control until resolved.",
        labels: ["prior-auth", "workflow", "clinician"],
        priority: "high",
        estimate: "l",
        acceptanceCriteria: [
          "PriorAuthRequest model + PriorAuthStatus enum",
          "Provider can attach supporting note text + relevant documents",
          "Status transitions: submitted → in_review → approved | denied | withdrawn",
          "Audit log entry on every transition",
        ],
        parentEpicSlug: epic,
      },
      {
        title: "PA queue surface in /ops",
        description:
          "An operator-facing queue at /ops/prior-auth showing pending, in-review, and recently-decided PA requests with SLA timers.",
        labels: ["prior-auth", "ops", "ui"],
        priority: "medium",
        estimate: "m",
        acceptanceCriteria: [
          "Metrics: pending count, median time-to-decision, approval rate",
          "Filter by payer and by provider",
          "Link each row back to the source prescription",
        ],
        parentEpicSlug: epic,
        dependsOn: ["Prior authorization request workflow"],
      },
    ],
  },

  // ---- alternatives engine ----
  {
    name: "alternatives-engine",
    matches: (t) =>
      t.includes("alternative") &&
      (t.includes("recommend") || t.includes("not covered") || t.includes("instead")),
    cards: (_input, epic) => [
      {
        title: "Coverage-aware alternatives suggestion engine",
        description:
          "When resolveCoverage returns tier_4 (not covered) or tier_3 (PA) for a selected product, suggest therapeutically-equivalent alternatives that sit in lower tiers on the same plan. Rank by (coverage_tier, clinician_pick, price).",
        labels: ["formulary", "engine", "backend"],
        priority: "high",
        estimate: "l",
        acceptanceCriteria: [
          "suggestAlternatives({ patientId, productId }) → ranked list",
          "Therapeutic equivalence uses Product.useCases + symptoms + format overlap",
          "Returns empty list explicitly when no equivalent product is on the plan",
        ],
        parentEpicSlug: epic,
        dependsOn: ["Coverage lookup API: given Patient + Product, return tier + actions"],
      },
      {
        title: "Show alternatives inline in the prescribing UI",
        description:
          "When a provider selects a non-covered product, surface up to three alternatives side-by-side with tier badge, price, and a one-click switch.",
        labels: ["prescribing", "ui", "clinician"],
        priority: "high",
        estimate: "m",
        acceptanceCriteria: [
          "Alternatives render below the product picker only when needed",
          "Switching preserves the visit context and dose form if possible",
          "Fires an analytics event on switch (accepted alt, declined)",
        ],
        parentEpicSlug: epic,
        dependsOn: ["Coverage-aware alternatives suggestion engine"],
      },
    ],
  },

  // ---- eRx parity ----
  {
    name: "erx-parity",
    matches: (t) =>
      (t.includes("prescribe") || t.includes("prescription") || t.includes("prescrib")) &&
      (t.includes("pharmaceutical") || t.includes("pill") || t.includes("exactly as")),
    cards: (_input, epic) => [
      {
        title: "CannabisPrescription data model — parity with RxPrescription",
        description:
          "Shape the CannabisPrescription model to match the fields clinicians already expect on a pharma prescription: sig, dose, frequency, duration, refills, diagnosis link, provider signature, effective date.",
        labels: ["prescribing", "prisma", "backend"],
        priority: "urgent",
        estimate: "m",
        acceptanceCriteria: [
          "Fields: patientId, providerId, productId, variantId?, sig, dose, unit, frequency, durationDays, refills, diagnosisIcd10, effectiveAt, status",
          "Status enum: draft | signed | sent | filled | cancelled | expired",
          "Audit log entry on every status change",
        ],
        parentEpicSlug: epic,
      },
      {
        title: "Provider prescribing UI: cannabis drawer with pharma parity",
        description:
          "One prescribing surface that handles both pharma and cannabis. Cannabis products render with tier badge, dose guidance, terpene profile, and COA link — but the clinical fields (sig, dose, refills, diagnosis) are identical to the pharma path.",
        labels: ["prescribing", "ui", "clinician"],
        priority: "urgent",
        estimate: "l",
        acceptanceCriteria: [
          "Unified <PrescribeDrawer /> handles RxPrescription + CannabisPrescription",
          "Sig/dose/frequency/refills fields shared between pills and cannabis",
          "Coverage tier resolved on product select; alternatives shown if tier_3 or tier_4",
          "Signed prescription writes an audit entry",
        ],
        parentEpicSlug: epic,
        dependsOn: [
          "CannabisPrescription data model — parity with RxPrescription",
          "Coverage lookup API: given Patient + Product, return tier + actions",
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------
// Truncation / ambiguity detection → openQuestions
// ---------------------------------------------------------------

const TRUNCATION_SUFFIXES = [
  /\binto\s+i$/i,
  /\bto\s+be$/i,
  /\bfor\s+the$/i,
  /\band$/i,
  /\bor$/i,
  /\bwith$/i,
  /\.\.\.$/,
  /\u2026$/,
];

function detectOpenQuestions(rawText: string): string[] {
  const questions: string[] = [];
  const trimmed = rawText.trim();

  // Detect mid-sentence truncation.
  const suffix = trimmed.slice(-20);
  if (TRUNCATION_SUFFIXES.some((re) => re.test(suffix))) {
    questions.push(
      `The prompt appears truncated ("…${suffix.replace(/\s+/g, " ")}"). Could you complete the final sentence? Mallik needs to know the intended integration target.`,
    );
  }

  // "integrated into i…" is a very specific ask from recent Patel prompts.
  if (/integrated\s+into\s+i\s*$/i.test(trimmed)) {
    questions.push(
      "Is 'integrated into i…' referring to iPad dispense terminals, iMessage status updates, inventory, or the eRx network (NCPDP SCRIPT)? The downstream cards depend on this.",
    );
  }

  // Vague scope flags.
  if (/full\s+tier\s+system/i.test(rawText) && !/four|three|tiers?\s*\d/i.test(rawText)) {
    questions.push(
      "How many tiers should the formulary have? Mallik proposed four (covered / step therapy / PA / not covered) — confirm before we commit to the enum.",
    );
  }

  return questions;
}

// ---------------------------------------------------------------
// Epic construction
// ---------------------------------------------------------------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function buildEpic(themeNames: string[], rawText: string): {
  slug: string;
  title: string;
  summary: string;
} {
  // Pick an epic title based on the strongest theme.
  const priorityOrder = [
    "billing-insurance-module",
    "erx-parity",
    "formulary-tier-system",
    "prior-authorization",
    "alternatives-engine",
  ];

  const lead = priorityOrder.find((t) => themeNames.includes(t)) ?? themeNames[0];

  const titles: Record<string, string> = {
    "billing-insurance-module": "Billing & Insurance module",
    "erx-parity": "Cannabis prescribing with pharma parity",
    "formulary-tier-system": "Cannabis formulary + tier system",
    "prior-authorization": "Prior authorization workflow",
    "alternatives-engine": "Coverage-aware alternatives",
  };

  const title = titles[lead] ?? "Product prompt epic";
  const slug = slugify(title);

  const summary =
    `Decomposed from a ${themeNames.length}-theme prompt: ${themeNames.join(", ")}. ` +
    `Source text begins: "${rawText.slice(0, 120)}${rawText.length > 120 ? "…" : ""}".`;

  return { slug, title, summary };
}

// ---------------------------------------------------------------
// Public decomposer
// ---------------------------------------------------------------

export function decomposePrompt(input: DecomposeInput): DecomposeOutput {
  const normText = norm(input.rawText);
  const matched = THEMES.filter((theme) => theme.matches(normText, input.rawText));

  if (matched.length === 0) {
    return {
      epicSlug: "unmatched-prompt",
      epicTitle: "Unmatched product prompt",
      summary:
        `Mallik did not recognize any known themes in this prompt. ` +
        `Source: ${input.author} via ${input.source}. ` +
        `Raw text stored for human triage.`,
      cards: [],
      openQuestions: [
        "This prompt does not match any of Mallik's themed templates. A human PM should triage it and either hand-write cards or add a new theme to Mallik.",
        ...detectOpenQuestions(input.rawText),
      ],
    };
  }

  const epic = buildEpic(
    matched.map((m) => m.name),
    input.rawText,
  );

  // Parse every card through the schema so defaults (labels: [],
  // dependsOn: [], acceptanceCriteria: [], priority) always apply —
  // no matter how terse a theme template is.
  const cards: LinearCard[] = matched
    .flatMap((theme) => theme.cards(input, epic.slug))
    .map((c) => LinearCardSchema.parse(c));
  const openQuestions = detectOpenQuestions(input.rawText);

  return {
    epicSlug: epic.slug,
    epicTitle: epic.title,
    summary: epic.summary,
    cards,
    openQuestions,
  };
}

// ---------------------------------------------------------------
// Agent wrapper
// ---------------------------------------------------------------

const input = z.object({ promptId: z.string() });
const output = z.object({
  epicSlug: z.string(),
  epicTitle: z.string(),
  summary: z.string(),
  cardCount: z.number(),
  openQuestionCount: z.number(),
});

export const productManagerAgent: Agent<z.infer<typeof input>, z.infer<typeof output>> = {
  name: "mallik",
  version: "1.0.0",
  description:
    "PM agent. Decomposes unstructured product prompts from founders (e.g. Dr. Patel's iMessages) into Linear-shaped task cards, an epic, a summary, and a list of clarifying questions.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.productPrompt", "write.productPrompt"],
  requiresApproval: false,

  async run({ promptId }, ctx) {
    ctx.assertCan("read.productPrompt");
    const row = await prisma.productPrompt.findUnique({ where: { id: promptId } });
    if (!row) throw new Error(`ProductPrompt not found: ${promptId}`);

    const result = decomposePrompt({
      rawText: row.rawText,
      source: row.source,
      author: row.author,
    });

    ctx.log("info", "Decomposed prompt", {
      themesMatched: result.cards.length > 0,
      cardCount: result.cards.length,
      openQuestionCount: result.openQuestions.length,
    });

    ctx.assertCan("write.productPrompt");
    await prisma.productPrompt.update({
      where: { id: promptId },
      data: {
        epicSlug: result.epicSlug,
        epicTitle: result.epicTitle,
        summary: result.summary,
        cards: result.cards as any,
        openQuestions: result.openQuestions as any,
        processedAt: new Date(),
        status: "decomposed",
        decomposedBy: `agent:mallik@1.0.0`,
      },
    });

    await writeAgentAudit(
      "mallik",
      "1.0.0",
      row.organizationId,
      "productPrompt.decomposed",
      { type: "ProductPrompt", id: promptId },
      { cardCount: result.cards.length, openQuestionCount: result.openQuestions.length },
    );

    return {
      epicSlug: result.epicSlug,
      epicTitle: result.epicTitle,
      summary: result.summary,
      cardCount: result.cards.length,
      openQuestionCount: result.openQuestions.length,
    };
  },
};
