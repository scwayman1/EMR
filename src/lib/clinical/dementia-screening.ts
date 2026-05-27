/**
 * EMR-079 — Dementia / Alzheimer's screening
 *
 * Composite screen built from two validated instruments:
 *   - Mini-Cog (clock draw + 3-word recall) — clinician-administered
 *   - AD8 (informant questionnaire) — family member or close contact
 *
 * Each subtest scores independently and we surface a combined
 * disposition the clinician can endorse, edit, or override.
 *
 * Sources:
 *   - Mini-Cog: Borson et al., 2000 — JAMA
 *   - AD8: Galvin et al., 2005 — Neurology
 */

export type ScreenSeverity = "normal" | "borderline" | "concerning";

export interface MiniCogInput {
  /** 0..3 — number of words recalled after distractor task */
  recall: number;
  /** Normal clock draw (yes/no). Borson scoring: normal = 2, abnormal = 0 */
  clockNormal: boolean;
}

export interface MiniCogResult {
  total: number; // 0..5
  severity: ScreenSeverity;
  interpretation: string;
}

export function scoreMiniCog(input: MiniCogInput): MiniCogResult {
  const recall = clamp(input.recall, 0, 3);
  const clock = input.clockNormal ? 2 : 0;
  const total = recall + clock;

  let severity: ScreenSeverity;
  let interpretation: string;
  if (total >= 4) {
    severity = "normal";
    interpretation =
      "Negative screen. Cognitive impairment unlikely. Reassess in 12 months or sooner if symptoms develop.";
  } else if (total === 3) {
    severity = "borderline";
    interpretation =
      "Borderline. Consider repeating in 1–3 months or escalating to MoCA / formal neuropsych testing.";
  } else {
    severity = "concerning";
    interpretation =
      "Positive screen. Workup recommended: MoCA + labs (TSH, B12, CMP), brain imaging, neurology or memory clinic referral.";
  }

  return { total, severity, interpretation };
}

/** AD8 — informant rates 8 yes/no items. */
export type Ad8Item =
  | "judgment"
  | "interest"
  | "repeats"
  | "learning"
  | "month_year"
  | "finances"
  | "appointments"
  | "thinking_memory";

export const AD8_ITEMS: Array<{ key: Ad8Item; prompt: string }> = [
  {
    key: "judgment",
    prompt: "Problems with judgment (e.g., bad financial decisions, falls for scams).",
  },
  {
    key: "interest",
    prompt: "Reduced interest in hobbies or activities.",
  },
  {
    key: "repeats",
    prompt: "Repeats questions, stories, or statements.",
  },
  {
    key: "learning",
    prompt: "Trouble learning how to use a tool, appliance, or gadget.",
  },
  {
    key: "month_year",
    prompt: "Forgets correct month or year.",
  },
  {
    key: "finances",
    prompt: "Difficulty handling complicated financial affairs (e.g., balancing checkbook, taxes).",
  },
  {
    key: "appointments",
    prompt: "Trouble remembering appointments.",
  },
  {
    key: "thinking_memory",
    prompt: "Daily problems with thinking and/or memory.",
  },
];

export type Ad8Answers = Partial<Record<Ad8Item, boolean>>;

export interface Ad8Result {
  total: number; // 0..8
  severity: ScreenSeverity;
  interpretation: string;
  unanswered: Ad8Item[];
}

export function scoreAd8(answers: Ad8Answers): Ad8Result {
  const unanswered = AD8_ITEMS.filter((i) => answers[i.key] === undefined).map(
    (i) => i.key
  );
  const total = AD8_ITEMS.reduce(
    (acc, i) => acc + (answers[i.key] === true ? 1 : 0),
    0
  );

  let severity: ScreenSeverity;
  let interpretation: string;
  if (total >= 2) {
    severity = "concerning";
    interpretation =
      "AD8 ≥ 2 suggests cognitive impairment per the informant. Pair with objective cognitive testing.";
  } else if (total === 1) {
    severity = "borderline";
    interpretation =
      "AD8 of 1 is below the typical cutoff but worth tracking — re-screen in 6 months.";
  } else {
    severity = "normal";
    interpretation =
      "AD8 of 0 — informant does not endorse change from prior level of function.";
  }

  return { total, severity, interpretation, unanswered };
}

export interface CompositeScreenResult {
  miniCog: MiniCogResult;
  ad8: Ad8Result | null;
  composite: ScreenSeverity;
  recommendation: string;
  /** If true, surface this screen at the top of the chart on next open. */
  flagForFollowUp: boolean;
}

export function combineScreens(
  miniCog: MiniCogResult,
  ad8: Ad8Result | null
): CompositeScreenResult {
  const severities: ScreenSeverity[] = [miniCog.severity];
  if (ad8) severities.push(ad8.severity);

  const composite: ScreenSeverity = severities.includes("concerning")
    ? "concerning"
    : severities.includes("borderline")
      ? "borderline"
      : "normal";

  let recommendation: string;
  switch (composite) {
    case "concerning":
      recommendation =
        "Order TSH + B12 + CMP, schedule MoCA, refer to memory clinic or neurology, and discuss caregiver support resources.";
      break;
    case "borderline":
      recommendation =
        "Repeat screening in 3 months. Review medications for cognitive side effects (anticholinergics, benzodiazepines, sedating antihistamines).";
      break;
    default:
      recommendation =
        "Reassure patient and family. Re-screen at next annual visit or sooner if symptoms develop.";
  }

  return {
    miniCog,
    ad8,
    composite,
    recommendation,
    flagForFollowUp: composite !== "normal",
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
