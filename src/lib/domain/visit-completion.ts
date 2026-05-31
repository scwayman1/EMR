export type VisitCompletionCardId =
  | "orders"
  | "follow_up"
  | "patient_message"
  | "practice_readiness";
export type VisitCompletionTone = "neutral" | "warning" | "alert";
export type VisitCompletionSource =
  | "note"
  | "coding"
  | "problem_list"
  | "encounter"
  | "heuristic";

export interface VisitCompletionItem {
  id: string;
  label: string;
  tone: VisitCompletionTone;
  source: VisitCompletionSource;
  reason?: string;
}

export interface VisitCompletionAction {
  id: string;
  label: string;
  variant: "primary" | "secondary";
}

export interface VisitCompletionCard {
  id: VisitCompletionCardId;
  title: string;
  subtitle: string;
  items: VisitCompletionItem[];
  actions: VisitCompletionAction[];
}

export interface VisitCompletionLearningSignal {
  actionId:
    | "release_care_plan"
    | "approve_all"
    | "edit_item"
    | "remove_item"
    | "defer_item";
  feedbackAction: "approved" | "approved_with_edits" | "rejected" | "dismissed";
  meaning: string;
}

export interface VisitCompletionLearningLoop {
  agentName: "visitCompletion";
  agentVersion: "1.0.0";
  signals: VisitCompletionLearningSignal[];
}

export interface VisitCompletionBundle {
  sectionLabel: "AI Visit Completion";
  heading: "Suggested Next Best Actions";
  primaryActionLabel: "Release Care Plan";
  supportActionLabel: "Approve all suggested actions";
  summary: string;
  releaseEnabled: boolean;
  learningLoop: VisitCompletionLearningLoop;
  cards: VisitCompletionCard[];
}

export interface VisitCompletionCodingSuggestion {
  icd10: { code: string; label: string; confidence?: number }[];
  emLevel: string | null;
  rationale?: string | null;
}

export interface VisitCompletionBlock {
  heading: string;
  body: string;
}

export interface BuildVisitCompletionBundleInput {
  patientFirstName: string;
  blocks: VisitCompletionBlock[];
  codingSuggestion: VisitCompletionCodingSuggestion | null;
  hasFutureAppointment: boolean;
}

const learningLoop: VisitCompletionLearningLoop = {
  agentName: "visitCompletion",
  agentVersion: "1.0.0",
  signals: [
    {
      actionId: "release_care_plan",
      feedbackAction: "approved",
      meaning: "Physician released the generated visit-completion bundle.",
    },
    {
      actionId: "approve_all",
      feedbackAction: "approved",
      meaning: "Physician accepted the suggested actions without item-level edits.",
    },
    {
      actionId: "edit_item",
      feedbackAction: "approved_with_edits",
      meaning: "Physician kept the suggestion but changed clinical or operational details.",
    },
    {
      actionId: "remove_item",
      feedbackAction: "rejected",
      meaning: "Physician removed a suggested action as inappropriate for this visit.",
    },
    {
      actionId: "defer_item",
      feedbackAction: "dismissed",
      meaning: "Physician deferred a suggested action without rejecting the concept.",
    },
  ],
};

export function buildVisitCompletionBundle(
  input: BuildVisitCompletionBundleInput,
): VisitCompletionBundle {
  const text = noteText(input.blocks);
  const cards: VisitCompletionCard[] = [
    buildOrdersCard(text),
    buildFollowUpCard(text, input.hasFutureAppointment),
    buildPatientMessageCard(input.patientFirstName, text),
    buildPracticeReadinessCard(input.codingSuggestion),
  ];

  return {
    sectionLabel: "AI Visit Completion",
    heading: "Suggested Next Best Actions",
    primaryActionLabel: "Release Care Plan",
    supportActionLabel: "Approve all suggested actions",
    summary: buildSummary(cards),
    releaseEnabled: cards.some((card) => card.items.length > 0),
    learningLoop,
    cards,
  };
}

function noteText(blocks: VisitCompletionBlock[]): string {
  return blocks
    .map((block) => `${block.heading}\n${block.body}`)
    .join("\n\n")
    .toLowerCase();
}

function buildOrdersCard(text: string): VisitCompletionCard {
  const diabetes = /\b(diabetes|diabetic|a1c|hba1c|glycemic)\b/.test(text);
  const medication = /\b(medication|med|dose|dosing|refill|regimen|prescribed)\b/.test(text);
  const pain = /\b(pain|arthritis|arthritic|somnolence|cbd|topical)\b/.test(text);

  const items: VisitCompletionItem[] = diabetes
    ? [
        item("a1c-due", "A1C if due or worsening control noted", "neutral", "heuristic"),
        item(
          "urine-albumin",
          "Urine albumin/creatinine screening if due",
          "neutral",
          "heuristic",
        ),
        item("renal-metabolic", "CMP / creatinine / eGFR check if due", "neutral", "heuristic"),
      ]
    : [
        item(
          "refill-check",
          medication ? "Medication refill check" : "Medication and regimen review",
          "neutral",
          "heuristic",
        ),
        item(
          "education-monitoring",
          pain
            ? "Monitor daytime somnolence after dose changes"
            : "Education or monitoring instruction from today’s plan",
          pain ? "warning" : "neutral",
          "note",
        ),
      ];

  return {
    id: "orders",
    title: "Suggested Orders",
    subtitle: "Based on today's assessment and active problems.",
    items,
    actions: [
      action("review_orders", "Review", "primary"),
      action("remove_item", "Remove", "secondary"),
      action("edit_item", "Edit", "secondary"),
    ],
  };
}

function buildFollowUpCard(text: string, hasFutureAppointment: boolean): VisitCompletionCard {
  const mentionsFollowUp =
    /\b(return to clinic|rtc|follow[-\s]?up|next visit|recheck|see (?:you|patient) in)\b/.test(text) ||
    /\bin \d+\s*(?:day|days|week|weeks|month|months)\b/.test(text);

  const items: VisitCompletionItem[] = [];
  if (mentionsFollowUp && !hasFutureAppointment) {
    items.push(
      item(
        "follow-up-missing",
        "Plan implies follow-up; no appointment scheduled",
        "alert",
        "note",
        "Follow-up language appears in the finalized plan.",
      ),
      item(
        "front-desk-scheduling",
        "Send scheduling task to front desk before patient leaves",
        "neutral",
        "heuristic",
      ),
    );
  } else if (mentionsFollowUp) {
    items.push(
      item(
        "follow-up-scheduled",
        "Follow-up mentioned and appointment already scheduled",
        "neutral",
        "encounter",
      ),
    );
  } else {
    items.push(
      item(
        "follow-up-review",
        "Confirm follow-up timing before releasing the care plan",
        "warning",
        "heuristic",
      ),
    );
  }

  return {
    id: "follow_up",
    title: "Follow-Up Plan",
    subtitle: "Recommended next touchpoint and scheduling handoff.",
    items,
    actions: [
      action("send_to_staff", "Send to staff", "primary"),
      action("defer_item", "Defer", "secondary"),
    ],
  };
}

function buildPatientMessageCard(
  patientFirstName: string,
  text: string,
): VisitCompletionCard {
  const hasLabs = /\b(lab|labs|a1c|cmp|lipid|urine)\b/.test(text);
  const hasEducation = /\b(goal|education|instructions|monitor|treatment)\b/.test(text);

  const items: VisitCompletionItem[] = [
    item(
      "portal-summary",
      `Portal summary drafted for ${patientFirstName}`,
      "neutral",
      "heuristic",
    ),
    item(
      "next-steps",
      hasLabs
        ? "Patient message includes lab instructions and follow-up timing"
        : "Patient message includes plain-language next steps",
      "neutral",
      "note",
    ),
  ];

  if (hasEducation) {
    items.push(
      item("education", "Education handoff ready for portal or print", "neutral", "heuristic"),
    );
  }

  return {
    id: "patient_message",
    title: "Patient Communication",
    subtitle: "Plain-language summary ready for portal or print.",
    items,
    actions: [
      action("preview_message", "Preview", "primary"),
      action("translate_message", "Translate", "secondary"),
      action("print_summary", "Print", "secondary"),
    ],
  };
}

function buildPracticeReadinessCard(
  codingSuggestion: VisitCompletionCodingSuggestion | null,
): VisitCompletionCard {
  const items: VisitCompletionItem[] = [];

  if (!codingSuggestion) {
    items.push(
      item(
        "coding-pending",
        "No coding suggestion yet",
        "warning",
        "coding",
        "Coding Readiness Agent has not attached metadata to this note yet.",
      ),
    );
  } else {
    if (codingSuggestion.emLevel) {
      items.push(
        item(
          "em-level",
          `Suggested E/M: ${codingSuggestion.emLevel}`,
          "neutral",
          "coding",
        ),
      );
    }
    for (const candidate of codingSuggestion.icd10.slice(0, 2)) {
      items.push(
        item(
          `icd10-${candidate.code}`,
          `ICD-10 candidate: ${candidate.code} ${candidate.label}`,
          "neutral",
          "coding",
        ),
      );
    }
    if (codingSuggestion.rationale) {
      items.push(
        item(
          "coding-rationale",
          "Coding rationale available for review",
          "neutral",
          "coding",
          codingSuggestion.rationale,
        ),
      );
    }
  }

  return {
    id: "practice_readiness",
    title: "Practice Readiness",
    subtitle: "Coding, documentation, and operational checks.",
    items,
    actions: [
      action("view_checks", "View checks", "primary"),
      action("edit_note", "Edit note", "secondary"),
    ],
  };
}

function buildSummary(cards: VisitCompletionCard[]): string {
  const orders = cards.find((card) => card.id === "orders")?.items.length ?? 0;
  const followUpTasks = cards.find((card) => card.id === "follow_up")?.items.length ?? 0;
  const patientMessages =
    cards.find((card) => card.id === "patient_message")?.items.length ?? 0;

  return `Includes ${orders} care actions, ${patientMessages > 0 ? 1 : 0} patient message, ${followUpTasks} staff tasks, and billing readiness check.`;
}

function item(
  id: string,
  label: string,
  tone: VisitCompletionTone,
  source: VisitCompletionSource,
  reason?: string,
): VisitCompletionItem {
  return { id, label, tone, source, reason };
}

function action(
  id: string,
  label: string,
  variant: VisitCompletionAction["variant"],
): VisitCompletionAction {
  return { id, label, variant };
}
