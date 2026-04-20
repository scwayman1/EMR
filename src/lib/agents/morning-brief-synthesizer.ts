import { resolveModelClient } from "@/lib/orchestration/model-client";
import type { BriefContext } from "@/lib/domain/morning-brief";

// ---------------------------------------------------------------------------
// Morning Brief Synthesizer Agent
// ---------------------------------------------------------------------------
// Takes a BriefContext (simple counts + emergency flag list) and produces a
// concise, human-readable summary for the top of /clinic/morning-brief.
//
// Design notes:
// - Temperature 0.3 keeps phrasing stable day over day. Clinicians hate when
//   a summary "reads different" without the underlying data changing.
// - No tool calling. This is a pure transform from numbers to prose.
// - We return a tone hint ("ok" | "watch" | "critical") so the UI card can
//   colour itself without re-reasoning over the text. The hint is derived
//   from the context, not the model output — the model only writes prose.
// ---------------------------------------------------------------------------

export type BriefTone = "ok" | "watch" | "critical";

export interface MorningBriefSynthesis {
  /** ≤3 sentence plain-English summary of today. */
  summary: string;
  /** ≤5 short bullets — the stuff worth surfacing. */
  highlights: string[];
  /** ≤3 short bullets — risks the clinician should attend to first. */
  risks: string[];
  /** UI colour hint. Derived from context, not model output. */
  tone: BriefTone;
}

const SYSTEM_PROMPT = `You are a clinical chief-of-staff writing a brief morning
summary for a cannabis-care clinician. You are given a structured JSON context
about today's cohort. Produce a concise overview.

Rules:
- Summary: ≤3 sentences, calm and professional. Lead with the headline number
  (patients today). Do not invent facts. Do not reference individual patients
  unless they appear in the context.
- Highlights: ≤5 short bullets (each ≤12 words). Things worth knowing at a
  glance. Skip items that are zero.
- Risks: ≤3 short bullets (each ≤12 words). Only list true risks that need
  action today. If the day is clean, return an empty risks array.
- No emojis. No markdown. No greetings. No sign-off.

Return JSON in exactly this shape, nothing else:
{
  "summary": "<string>",
  "highlights": ["<string>", ...],
  "risks": ["<string>", ...]
}`;

function buildTone(context: BriefContext): BriefTone {
  if (context.emergencyFlags.length > 0) return "critical";
  if (context.hasCriticalSignal) return "watch";
  if (context.pendingApprovals >= 3 || context.newLabsToday >= 3) return "watch";
  return "ok";
}

function fallbackSynthesis(context: BriefContext): MorningBriefSynthesis {
  const highlights: string[] = [];
  if (context.appointmentsToday > 0) {
    highlights.push(
      `${context.appointmentsToday} appointment${context.appointmentsToday === 1 ? "" : "s"} today`
    );
  }
  if (context.pendingApprovals > 0) {
    highlights.push(
      `${context.pendingApprovals} AI draft${context.pendingApprovals === 1 ? "" : "s"} awaiting approval`
    );
  }
  if (context.newLabsToday > 0) {
    highlights.push(
      `${context.newLabsToday} new lab${context.newLabsToday === 1 ? "" : "s"} in the last 24h`
    );
  }

  const risks = context.emergencyFlags.slice(0, 3);

  const summary =
    context.appointmentsToday === 0 && context.pendingApprovals === 0
      ? "Quiet morning — no appointments on the books and nothing waiting for approval."
      : `You have ${context.appointmentsToday} patient${context.appointmentsToday === 1 ? "" : "s"} scheduled today${
          context.pendingApprovals > 0
            ? ` and ${context.pendingApprovals} AI draft${context.pendingApprovals === 1 ? "" : "s"} to review`
            : ""
        }.`;

  return {
    summary,
    highlights,
    risks,
    tone: buildTone(context),
  };
}

/**
 * Synthesize the morning brief via the configured model client. Falls back
 * to a deterministic template when the model is unavailable, errors, or
 * returns unparseable JSON — the page uses that fallback to stay up.
 */
export async function synthesizeMorningBrief(
  context: BriefContext
): Promise<MorningBriefSynthesis> {
  const model = resolveModelClient();
  const tone = buildTone(context);

  const userPayload = JSON.stringify(
    {
      date: context.date.toISOString().slice(0, 10),
      appointmentsToday: context.appointmentsToday,
      pendingApprovals: context.pendingApprovals,
      newLabsToday: context.newLabsToday,
      emergencyFlags: context.emergencyFlags,
    },
    null,
    2
  );

  const prompt = `${SYSTEM_PROMPT}\n\nCONTEXT:\n${userPayload}`;

  let raw: string;
  try {
    raw = await model.complete(prompt, { maxTokens: 400, temperature: 0.3 });
  } catch {
    return fallbackSynthesis(context);
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return fallbackSynthesis(context);

  let parsed: {
    summary?: unknown;
    highlights?: unknown;
    risks?: unknown;
  };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return fallbackSynthesis(context);
  }

  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim().length > 0
      ? parsed.summary.trim()
      : fallbackSynthesis(context).summary;

  const highlights = Array.isArray(parsed.highlights)
    ? parsed.highlights
        .filter((h): h is string => typeof h === "string" && h.trim().length > 0)
        .map((h) => h.trim())
        .slice(0, 5)
    : [];

  const risks = Array.isArray(parsed.risks)
    ? parsed.risks
        .filter((r): r is string => typeof r === "string" && r.trim().length > 0)
        .map((r) => r.trim())
        .slice(0, 3)
    : [];

  return { summary, highlights, risks, tone };
}
