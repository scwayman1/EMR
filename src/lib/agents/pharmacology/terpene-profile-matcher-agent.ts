import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

// EMR-272 — Terpene Profile Matcher (POC, real logic).
//
// Given a marketplace product's terpene profile, returns ranked therapeutic
// hints drawn from a curated terpene→indication table. The knowledge table
// is intentionally small and conservative — structure/function framing only,
// no disease claims (aligns with the FDA screening Codex is building in
// EMR-243). Expand the table as EMR-146's Health Canada ingest matures.

const input = z.object({
  productId: z.string().optional(),
  terpeneProfile: z.record(z.number()).optional(),
});

const output = z.object({
  productId: z.string().optional(),
  dominantTerpenes: z.array(
    z.object({
      terpene: z.string(),
      concentration: z.number(),
    }),
  ),
  therapeuticHints: z.array(
    z.object({
      hint: z.string(),
      supportingTerpenes: z.array(z.string()),
      evidenceLevel: z.enum(["anecdotal", "preclinical", "clinical"]),
    }),
  ),
  resolvedFrom: z.enum(["input_profile", "product_fetch", "empty"]),
});

interface TerpeneKnowledge {
  hint: string;
  evidence: "anecdotal" | "preclinical" | "clinical";
}

// Conservative structure/function hints. One terpene can contribute to
// multiple hints; hints aggregate across matching terpenes.
const TERPENE_TABLE: Record<string, TerpeneKnowledge[]> = {
  myrcene: [
    { hint: "supports restful sleep", evidence: "preclinical" },
    { hint: "contributes to body-forward, calming effects", evidence: "anecdotal" },
  ],
  linalool: [
    { hint: "supports a calm mood", evidence: "preclinical" },
    { hint: "supports restful sleep", evidence: "anecdotal" },
  ],
  limonene: [
    { hint: "supports a positive mood", evidence: "preclinical" },
    { hint: "may encourage alertness", evidence: "anecdotal" },
  ],
  pinene: [
    { hint: "supports mental clarity and focus", evidence: "preclinical" },
    { hint: "may ease the sensation of body heaviness", evidence: "anecdotal" },
  ],
  alphaPinene: [
    { hint: "supports mental clarity and focus", evidence: "preclinical" },
  ],
  betaPinene: [
    { hint: "supports mental clarity and focus", evidence: "preclinical" },
  ],
  caryophyllene: [
    { hint: "supports recovery after activity", evidence: "preclinical" },
    { hint: "contributes to a grounded feeling", evidence: "anecdotal" },
  ],
  betaCaryophyllene: [
    { hint: "supports recovery after activity", evidence: "preclinical" },
  ],
  humulene: [
    { hint: "may moderate appetite", evidence: "anecdotal" },
  ],
  terpinolene: [
    { hint: "supports an uplifted, engaged state", evidence: "anecdotal" },
  ],
  ocimene: [
    { hint: "supports alertness", evidence: "anecdotal" },
  ],
  eucalyptol: [
    { hint: "supports easy breathing", evidence: "preclinical" },
  ],
};

const EVIDENCE_RANK: Record<"anecdotal" | "preclinical" | "clinical", number> = {
  clinical: 3,
  preclinical: 2,
  anecdotal: 1,
};

function normalizeKey(raw: string): string {
  return raw
    .trim()
    // Strip common prefix notations so e.g. "β-caryophyllene" and
    // "beta_caryophyllene" both map to "betaCaryophyllene" → fall back to
    // "caryophyllene" when not present in the table.
    .replace(/[\s_\-]+/g, "")
    .replace(/β/g, "beta")
    .replace(/α/g, "alpha")
    .toLowerCase();
}

function lookupTerpene(raw: string): { key: string; knowledge: TerpeneKnowledge[] } | null {
  const key = normalizeKey(raw);
  // Try direct match, then alpha/beta-prefix stripped match.
  const direct = TERPENE_TABLE[Object.keys(TERPENE_TABLE).find((k) => k.toLowerCase() === key) ?? ""];
  if (direct) return { key, knowledge: direct };
  const stripped = key.replace(/^(alpha|beta)/, "");
  const fallbackKey = Object.keys(TERPENE_TABLE).find(
    (k) => k.toLowerCase() === stripped,
  );
  if (fallbackKey) return { key, knowledge: TERPENE_TABLE[fallbackKey] };
  return null;
}

/**
 * Terpene Profile Matcher (EMR-272 POC)
 * -------------------------------------
 * Input: a product ID (looks up `Product.terpeneProfile`) or an inline
 * terpene profile. Output: dominant terpenes (sorted desc by
 * concentration) + therapeutic hints aggregated from a curated table.
 *
 * Hints are structure/function framed, never disease claims.
 */
export const terpeneProfileMatcherAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "terpeneProfileMatcher",
  version: "0.1.0",
  description:
    "Maps a product's terpene profile to structure/function therapeutic hints.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ productId, terpeneProfile }, ctx) {
    let profile = terpeneProfile;
    let resolvedFrom: z.infer<typeof output>["resolvedFrom"] = "input_profile";

    if (!profile && productId) {
      const { prisma } = await import("@/lib/db/prisma");
      const p = await prisma.product.findUnique({
        where: { id: productId },
        select: { terpeneProfile: true },
      });
      profile = (p?.terpeneProfile ?? null) as Record<string, number> | null ?? undefined;
      resolvedFrom = profile ? "product_fetch" : "empty";
    }

    if (!profile || Object.keys(profile).length === 0) {
      ctx.log("info", "terpeneProfileMatcher: empty profile", { productId });
      return {
        productId,
        dominantTerpenes: [],
        therapeuticHints: [],
        resolvedFrom: profile === undefined ? "empty" : resolvedFrom,
      };
    }

    const dominantTerpenes = Object.entries(profile)
      .filter(([, v]) => typeof v === "number" && v > 0)
      .map(([terpene, concentration]) => ({ terpene, concentration }))
      .sort(
        (a, b) =>
          b.concentration - a.concentration || a.terpene.localeCompare(b.terpene),
      );

    // Aggregate hints. Each hint carries supporting terpenes + the highest
    // evidence level among contributing terpenes.
    const byHint = new Map<
      string,
      {
        supportingTerpenes: Set<string>;
        evidence: "anecdotal" | "preclinical" | "clinical";
        topConcentration: number;
      }
    >();
    for (const { terpene, concentration } of dominantTerpenes) {
      const looked = lookupTerpene(terpene);
      if (!looked) continue;
      for (const entry of looked.knowledge) {
        const existing = byHint.get(entry.hint);
        if (existing) {
          existing.supportingTerpenes.add(terpene);
          if (EVIDENCE_RANK[entry.evidence] > EVIDENCE_RANK[existing.evidence]) {
            existing.evidence = entry.evidence;
          }
          if (concentration > existing.topConcentration) {
            existing.topConcentration = concentration;
          }
        } else {
          byHint.set(entry.hint, {
            supportingTerpenes: new Set([terpene]),
            evidence: entry.evidence,
            topConcentration: concentration,
          });
        }
      }
    }

    const therapeuticHints = [...byHint.entries()]
      .map(([hint, meta]) => ({
        hint,
        supportingTerpenes: [...meta.supportingTerpenes].sort(),
        evidenceLevel: meta.evidence,
        _topConcentration: meta.topConcentration,
      }))
      .sort(
        (a, b) =>
          EVIDENCE_RANK[b.evidenceLevel] - EVIDENCE_RANK[a.evidenceLevel] ||
          b._topConcentration - a._topConcentration ||
          a.hint.localeCompare(b.hint),
      )
      .map(({ _topConcentration, ...rest }) => rest);

    ctx.log("info", "terpeneProfileMatcher matched hints", {
      productId,
      dominantTerpeneCount: dominantTerpenes.length,
      hintCount: therapeuticHints.length,
    });

    return {
      productId,
      dominantTerpenes,
      therapeuticHints,
      resolvedFrom,
    };
  },
};
