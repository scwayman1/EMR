import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

// ---------------------------------------------------------------------------
// Satisfaction Analysis Agent
// ---------------------------------------------------------------------------
// Computes NPS (Net Promoter Score) over a date window for an org and pulls
// themes out of free-text responses. NPS is standard: 9-10 = promoter,
// 7-8 = passive, 0-6 = detractor. NPS = %promoters - %detractors.
// ---------------------------------------------------------------------------

const input = z.object({
  organizationId: z.string(),
  dateRangeDays: z.number().int().positive().max(365),
});

const output = z.object({
  npsScore: z.number(),
  promoters: z.number(),
  detractors: z.number(),
  themes: z.array(z.string()),
  insights: z.array(z.string()),
});

function collectFreeText(responses: unknown): string[] {
  if (!Array.isArray(responses)) return [];
  const out: string[] = [];
  for (const r of responses) {
    if (typeof r === "object" && r !== null) {
      const v = (r as any).value;
      if (typeof v === "string" && v.trim().length > 2) out.push(v.trim());
    }
  }
  return out;
}

// Lightweight keyword-based theme extractor used when the LLM is unavailable.
const THEME_KEYWORDS: Record<string, string[]> = {
  "wait times": ["wait", "waiting", "slow", "long"],
  "staff friendliness": ["friendly", "kind", "nice", "welcoming", "rude"],
  "clarity of care plan": ["confus", "unclear", "understand", "clear", "explain"],
  "telehealth experience": ["video", "zoom", "telehealth", "virtual"],
  "product selection": ["product", "strain", "tincture", "gummy", "flower"],
  "billing experience": ["bill", "charge", "insurance", "cost", "expensive"],
  "scheduling": ["schedul", "appointment", "reschedule", "book"],
};

function extractThemesFromText(texts: string[]): string[] {
  const counts = new Map<string, number>();
  for (const t of texts) {
    const lower = t.toLowerCase();
    for (const [theme, kws] of Object.entries(THEME_KEYWORDS)) {
      if (kws.some((k) => lower.includes(k))) {
        counts.set(theme, (counts.get(theme) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme]) => theme);
}

export const satisfactionAnalysisAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "satisfactionAnalysis",
  version: "1.0.0",
  description:
    "Computes NPS and surfaces free-text themes from recent survey " +
    "submissions for an organization.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.patient"],
  requiresApproval: false,

  async run({ organizationId, dateRangeDays }, ctx) {
    ctx.assertCan("read.patient");

    const since = new Date(Date.now() - dateRangeDays * 24 * 60 * 60 * 1000);

    const submissions = await prisma.surveySubmission.findMany({
      where: {
        submittedAt: { gte: since },
        patient: { organizationId },
      },
      orderBy: { submittedAt: "desc" },
      take: 500,
    });

    let promoters = 0;
    let passives = 0;
    let detractors = 0;
    const freeText: string[] = [];

    for (const s of submissions) {
      if (typeof s.npsScore === "number") {
        if (s.npsScore >= 9) promoters += 1;
        else if (s.npsScore >= 7) passives += 1;
        else detractors += 1;
      }
      freeText.push(...collectFreeText(s.responses));
    }

    const totalScored = promoters + passives + detractors;
    const npsScore =
      totalScored > 0
        ? Math.round(((promoters - detractors) / totalScored) * 100)
        : 0;

    // Try LLM for themes + insights
    let themes: string[] = [];
    let insights: string[] = [];

    if (freeText.length > 0) {
      const sample = freeText.slice(0, 40).join("\n- ");
      const prompt = `You are analyzing post-visit patient survey feedback at a cannabis care practice. Summarize the feedback.

NPS: ${npsScore} (promoters: ${promoters}, detractors: ${detractors}, passives: ${passives})
Sample feedback:
- ${sample}

Return ONLY valid JSON:
{
  "themes": ["3-5 short theme labels, e.g. 'wait times', 'staff friendliness'"],
  "insights": ["3-5 concrete, actionable insights for the practice"]
}`;

      try {
        const raw = await ctx.model.complete(prompt, {
          maxTokens: 600,
          temperature: 0.3,
        });
        const jm =
          raw.match(/```(?:json)?\s*([\s\S]*?)```/) ||
          raw.match(/(\{[\s\S]*\})/);
        if (jm) {
          const parsed = JSON.parse(jm[1] || jm[0]);
          if (Array.isArray(parsed.themes)) themes = parsed.themes.map(String);
          if (Array.isArray(parsed.insights))
            insights = parsed.insights.map(String);
        }
      } catch (err) {
        ctx.log("warn", "Satisfaction LLM failed — falling back", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (themes.length === 0) {
      themes = extractThemesFromText(freeText);
    }

    if (insights.length === 0) {
      insights = [];
      if (detractors > promoters) {
        insights.push(
          `Detractors (${detractors}) outnumber promoters (${promoters}) — investigate recent negative feedback.`
        );
      }
      if (npsScore >= 50) {
        insights.push(
          `NPS of ${npsScore} is strong — feature these patients in testimonials.`
        );
      }
      if (themes.length > 0) {
        insights.push(
          `Top theme "${themes[0]}" should be the focus of your next improvement cycle.`
        );
      }
      if (insights.length === 0) {
        insights.push(
          "Not enough data yet — keep collecting post-visit surveys to surface patterns."
        );
      }
    }

    await writeAgentAudit(
      "satisfactionAnalysis",
      "1.0.0",
      organizationId,
      "satisfaction.analyzed",
      { type: "Organization", id: organizationId },
      { npsScore, promoters, detractors, submissions: submissions.length }
    );

    ctx.log("info", "Satisfaction analysis complete", {
      npsScore,
      promoters,
      detractors,
    });

    return {
      npsScore,
      promoters,
      detractors,
      themes,
      insights,
    };
  },
};
