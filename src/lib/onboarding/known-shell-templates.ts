// Known shell template catalog — EMR-425.
//
// The Practice Onboarding wizard's steps 9 (patient portal) and 10 (physician
// Mission Control) ask the admin to pick a shell *template*. A template is a
// preset bundle of cards / surfaces that the patient or clinician will see
// once the configuration publishes (the actual rendering is owned by
// EMR-411 / EMR-412 — this file only describes the picker options).
//
// Specialty-adaptive rule: the templates listed here are *generic* presets,
// not specialty-specific. A specialty's manifest can also derive its own
// "Recommended for <specialty>" template at runtime by mapping
// `manifest.default_patient_portal_cards` /
// `manifest.default_mission_control_cards` into a `ShellTemplateOption`.
// We never branch on `slug === 'cannabis-medicine'` here.

export type ShellTemplateOption = {
  /** Stable id — persisted as `patientShellTemplateId` /
   * `physicianShellTemplateId` on the PracticeConfiguration row. */
  id: string;
  label: string;
  description: string;
  /** Ordered list of card identifiers this template renders. The order is
   * the canonical render order of the shell. The physician picker lets the
   * admin reorder; the patient picker shows the order as a preview. */
  cards: string[];
};

/**
 * Patient portal shell templates. Card ids match the ones declared in
 * specialty manifests' `default_patient_portal_cards` so the same render
 * pipeline (EMR-411) can resolve any of them.
 *
 * Keep at least three options so the picker is meaningful and the UI doesn't
 * collapse to a single-card "are you sure?" page.
 */
export const PATIENT_SHELL_TEMPLATES: ShellTemplateOption[] = [
  {
    id: "patient-shell-essentials",
    label: "Essentials",
    description:
      "A minimal portal: appointments, messages, and educational resources. " +
      "Best for practices that want a clean, low-friction patient experience.",
    cards: [
      "welcome",
      "upcoming-appointments",
      "messages",
      "education",
    ],
  },
  {
    id: "patient-shell-longitudinal-care",
    label: "Longitudinal care",
    description:
      "Adds labs, medications, and billing on top of the essentials. " +
      "The default for primary-care and chronic-disease practices.",
    cards: [
      "welcome",
      "upcoming-appointments",
      "lab-results",
      "medications",
      "messages",
      "education",
      "billing",
    ],
  },
  {
    id: "patient-shell-outcome-tracking",
    label: "Outcome tracking",
    description:
      "Per-visit check-ins, weekly outcome scales, and goal progress. Best " +
      "for specialties that rely on patient-reported outcomes.",
    cards: [
      "welcome",
      "upcoming-appointments",
      "post-visit-checkins",
      "weekly-outcome-scales",
      "goal-progress",
      "messages",
      "education",
    ],
  },
  {
    id: "patient-shell-procedural",
    label: "Procedural",
    description:
      "Optimised for procedure-heavy practices: pre-op instructions, " +
      "consent forms, and a pain or recovery diary.",
    cards: [
      "welcome",
      "upcoming-appointments",
      "pre-op-instructions",
      "consent-forms",
      "pain-diary",
      "functional-goals",
      "messages",
      "billing",
    ],
  },
];

/**
 * Physician Mission Control shell templates. Card ids match
 * `default_mission_control_cards` from specialty manifests.
 *
 * The order in `cards` is significant — it's the rendered order of the
 * Mission Control dashboard. Step 10 lets the admin reorder via up/down
 * buttons (no drag library is currently installed; see EMR-425 ticket).
 */
export const PHYSICIAN_SHELL_TEMPLATES: ShellTemplateOption[] = [
  {
    id: "physician-shell-clinic-day",
    label: "Clinic day",
    description:
      "Schedule-first dashboard for a typical outpatient clinic day. Open " +
      "charts and the inbox sit alongside today's schedule.",
    cards: [
      "todays-schedule",
      "open-charts",
      "messages-inbox",
      "refill-requests",
    ],
  },
  {
    id: "physician-shell-longitudinal-care",
    label: "Longitudinal care",
    description:
      "Adds lab and imaging review queues for primary-care and chronic-care " +
      "workflows. The default for longitudinal practices.",
    cards: [
      "todays-schedule",
      "open-charts",
      "lab-results-pending-review",
      "imaging-pending-review",
      "messages-inbox",
      "refill-requests",
    ],
  },
  {
    id: "physician-shell-procedural",
    label: "Procedural",
    description:
      "Procedure board first. Best for interventional and pain-management " +
      "practices that batch procedure days.",
    cards: [
      "todays-schedule",
      "procedure-board",
      "open-charts",
      "imaging-pending-review",
      "controlled-substance-monitoring",
      "messages-inbox",
      "refill-requests",
    ],
  },
  {
    id: "physician-shell-certification",
    label: "Certification + follow-up",
    description:
      "Certification queue and outcome check-ins surfaced for specialties " +
      "with a recurring qualifying-visit cadence.",
    cards: [
      "todays-schedule",
      "open-charts",
      "certifications-due",
      "outcome-checkins",
      "messages-inbox",
    ],
  },
];

/**
 * Look up a patient template by id. Returns null when not found — callers
 * (the wizard step) render a recoverable empty state rather than throwing.
 */
export function getPatientShellTemplate(
  id: string | null | undefined,
): ShellTemplateOption | null {
  if (!id) return null;
  return PATIENT_SHELL_TEMPLATES.find((t) => t.id === id) ?? null;
}

/** Look up a physician template by id. */
export function getPhysicianShellTemplate(
  id: string | null | undefined,
): ShellTemplateOption | null {
  if (!id) return null;
  return PHYSICIAN_SHELL_TEMPLATES.find((t) => t.id === id) ?? null;
}

/**
 * Build a "Recommended for <specialty>" template option from a manifest's
 * `default_patient_portal_cards`. The result is always pinned with id
 * `${slug}-patient-shell` to match the registry's `applyTemplateDefaults`
 * convention — so a draft seeded by the registry already references this id.
 */
export function deriveSpecialtyPatientTemplate(
  slug: string,
  specialtyName: string,
  cards: string[],
): ShellTemplateOption | null {
  if (!cards.length) return null;
  return {
    id: `${slug}-patient-shell`,
    label: `Recommended for ${specialtyName}`,
    description:
      `The patient-portal cards configured by the ${specialtyName} ` +
      `specialty template.`,
    cards: [...cards],
  };
}

/**
 * Build a "Recommended for <specialty>" Mission Control template option
 * from a manifest's `default_mission_control_cards`.
 */
export function deriveSpecialtyPhysicianTemplate(
  slug: string,
  specialtyName: string,
  cards: string[],
): ShellTemplateOption | null {
  if (!cards.length) return null;
  return {
    id: `${slug}-physician-shell`,
    label: `Recommended for ${specialtyName}`,
    description:
      `The Mission Control cards configured by the ${specialtyName} ` +
      `specialty template.`,
    cards: [...cards],
  };
}

// ---------------------------------------------------------------------------
// Card label registry
//
// The picker shows a friendly label for each card in the inline preview.
// Card ids unknown to this registry fall back to a humanised version of
// the id, so we never block the wizard on a missing translation.
// ---------------------------------------------------------------------------

const CARD_LABELS: Record<string, string> = {
  // Patient cards
  welcome: "Welcome",
  "upcoming-appointments": "Upcoming visits",
  "lab-results": "Lab results",
  medications: "Medications",
  messages: "Messages",
  education: "Education",
  billing: "Billing",
  "post-visit-checkins": "Post-visit check-ins",
  "weekly-outcome-scales": "Weekly outcome scales",
  "goal-progress": "Goal progress",
  "pre-op-instructions": "Pre-op instructions",
  "consent-forms": "Consent forms",
  "pain-diary": "Pain diary",
  "functional-goals": "Functional goals",
  "active-recommendations": "Active recommendations",
  "post-dose-checkins": "Post-dose check-ins",
  "leafmart-orders": "Leafmart orders",
  // Physician cards
  "todays-schedule": "Today's schedule",
  "open-charts": "Open charts",
  "lab-results-pending-review": "Lab review queue",
  "imaging-pending-review": "Imaging review queue",
  "messages-inbox": "Messages inbox",
  "refill-requests": "Refill requests",
  "procedure-board": "Procedure board",
  "controlled-substance-monitoring": "Controlled substance monitoring",
  "certifications-due": "Certifications due",
  "outcome-checkins": "Outcome check-ins",
};

/** Friendly label for a card id, falling back to a humanised version. */
export function labelForCard(id: string): string {
  if (CARD_LABELS[id]) return CARD_LABELS[id];
  // Humanise: "some-card-id" → "Some card id"
  const spaced = id.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
