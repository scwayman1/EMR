/**
 * EMR-173 — 15-day cannabis EMR launch readiness.
 *
 * Day-by-day plan a brand-new cannabis clinic follows to be live in 15
 * business days. Each day has a small ordered checklist; each item has
 * an owner role, a system surface (route or doc) and a "blocker" flag
 * that determines whether the day's gate can close.
 *
 * The /ops/launch page already shows the existing 4-step practice
 * launch checklist. This module is the *deeper* 15-day ramp — used by
 * the /ops/launch-15-day surface and by the launch agent to compute a
 * day-by-day readiness score.
 */

export type OwnerRole =
  | "practice_owner"
  | "clinician"
  | "operator"
  | "biller"
  | "compliance"
  | "leafjourney_csm";

export interface LaunchTask {
  id: string;
  title: string;
  /** Detailed instruction surfaced when the row is expanded. */
  detail: string;
  owner: OwnerRole;
  /** Surface (route, doc anchor, or external system) where the work happens. */
  surface: string;
  /** When true, the day cannot close until the task is complete. */
  blocker: boolean;
  /** Estimated minutes to complete. */
  etaMinutes: number;
}

export interface LaunchDay {
  day: number; // 1..15
  theme: string;
  /** What "done" looks like at the end of the day. */
  exitCriteria: string;
  tasks: LaunchTask[];
}

export const LAUNCH_PLAN: LaunchDay[] = [
  {
    day: 1,
    theme: "Foundations + practice identity",
    exitCriteria: "Org provisioned, branding approved, first owner signed in.",
    tasks: [
      {
        id: "d1-org-create",
        title: "Provision organization in Leafjourney",
        detail:
          "CSM provisions the organization, assigns the practice owner role, and sends the welcome email.",
        owner: "leafjourney_csm",
        surface: "/admin/organizations",
        blocker: true,
        etaMinutes: 20,
      },
      {
        id: "d1-baa",
        title: "Sign HIPAA BAA",
        detail:
          "Practice owner reviews and e-signs the Business Associate Agreement. Counter-signed copy stored in Documents.",
        owner: "practice_owner",
        surface: "/legal/baa",
        blocker: true,
        etaMinutes: 15,
      },
      {
        id: "d1-branding",
        title: "Upload logo + select palette",
        detail:
          "Optional but high-impact for white-label deployments. Ships immediately.",
        owner: "practice_owner",
        surface: "/ops/branding",
        blocker: false,
        etaMinutes: 30,
      },
    ],
  },
  {
    day: 2,
    theme: "Provider + staff onboarding",
    exitCriteria: "All clinicians + operators invited, NPIs verified.",
    tasks: [
      {
        id: "d2-invite-clinician",
        title: "Invite clinicians",
        detail:
          "Invite each prescribing clinician with NPI, taxonomy code, DEA number (if applicable), and state license.",
        owner: "practice_owner",
        surface: "/ops/onboarding",
        blocker: true,
        etaMinutes: 25,
      },
      {
        id: "d2-invite-ops",
        title: "Invite intake operators",
        detail:
          "Invite the front-desk / intake operators. They can run scheduling and intake without clinical permissions.",
        owner: "practice_owner",
        surface: "/ops/onboarding",
        blocker: true,
        etaMinutes: 15,
      },
      {
        id: "d2-cme",
        title: "Enroll clinicians in cannabis CME (optional)",
        detail:
          "Eligible clinicians can opt into the CME curriculum (EMR-126). 42 hours, AMA PRA Category 1.",
        owner: "clinician",
        surface: "/clinicians/cme",
        blocker: false,
        etaMinutes: 10,
      },
    ],
  },
  {
    day: 3,
    theme: "Compliance + state-specific cannabis rules",
    exitCriteria: "State compliance form configured. Schedule III + state cannabis rules confirmed.",
    tasks: [
      {
        id: "d3-state-rules",
        title: "Configure state cannabis rules",
        detail:
          "Select the state(s) the practice serves; the registry pre-loads possession limits, certification cadence, and required forms.",
        owner: "compliance",
        surface: "/ops/policies",
        blocker: true,
        etaMinutes: 30,
      },
      {
        id: "d3-controlled-rx",
        title: "Confirm controlled-substance prescribing setup",
        detail:
          "Surescripts EPCS verification per clinician. Required for any DEA-controlled prescribing.",
        owner: "clinician",
        surface: "/clinic/settings/epcs",
        blocker: false,
        etaMinutes: 60,
      },
    ],
  },
  {
    day: 4,
    theme: "Clinical templates + intake form",
    exitCriteria: "First intake template + first APSO template approved.",
    tasks: [
      {
        id: "d4-intake-template",
        title: "Configure intake template",
        detail:
          "Pick from the cannabis intake library or build custom. Required fields: chief complaint, current Rx, cannabis history, allergies.",
        owner: "operator",
        surface: "/ops/intake-builder",
        blocker: true,
        etaMinutes: 45,
      },
      {
        id: "d4-apso-template",
        title: "Confirm APSO note template",
        detail:
          "Default APSO template includes Combo Wheel, dosing primitives, and outcome scale. Review and tweak phrasing.",
        owner: "clinician",
        surface: "/clinic/templates",
        blocker: true,
        etaMinutes: 30,
      },
    ],
  },
  {
    day: 5,
    theme: "Billing + clearinghouse",
    exitCriteria: "Clearinghouse adapter live, payer mix loaded, first dummy claim cycled end-to-end.",
    tasks: [
      {
        id: "d5-clearinghouse",
        title: "Connect clearinghouse",
        detail:
          "Pick Availity / Waystar / Change. CSM flips the adapter on; smoke-test claim cycles through 999 + 277CA.",
        owner: "leafjourney_csm",
        surface: "/ops/integrations",
        blocker: true,
        etaMinutes: 60,
      },
      {
        id: "d5-payer-mix",
        title: "Load top 5 payer rules",
        detail:
          "From PayerRule registry. CSM seeds the practice's top 5; biller can refine.",
        owner: "biller",
        surface: "/ops/contracts",
        blocker: true,
        etaMinutes: 45,
      },
      {
        id: "d5-test-claim",
        title: "Run dummy claim end-to-end",
        detail:
          "Synthetic patient + encounter + claim → submission → mock 277CA + 835. Confirms the fleet.",
        owner: "biller",
        surface: "/ops/billing-orchestrator",
        blocker: true,
        etaMinutes: 30,
      },
    ],
  },
  {
    day: 6,
    theme: "Patient portal + communications",
    exitCriteria: "SMS / email templates approved, portal open for self-registration.",
    tasks: [
      {
        id: "d6-portal-config",
        title: "Configure patient portal modules",
        detail:
          "Toggle Garden, Combo Wheel, Storybook visit summary, dose log surfaces.",
        owner: "practice_owner",
        surface: "/ops/feature-flags",
        blocker: true,
        etaMinutes: 20,
      },
      {
        id: "d6-templates",
        title: "Approve communication templates",
        detail:
          "SMS reminder, appointment confirmation, intake nudge, statement notification. Plain-language defaults provided.",
        owner: "operator",
        surface: "/ops/announcements",
        blocker: true,
        etaMinutes: 30,
      },
    ],
  },
  {
    day: 7,
    theme: "Scheduling + visit types",
    exitCriteria: "Provider calendars synced, visit types defined, first booking placed.",
    tasks: [
      {
        id: "d7-visit-types",
        title: "Define visit types + durations",
        detail:
          "New patient (60 min), follow-up (30 min), urgent (15 min). Adjust per provider preference.",
        owner: "operator",
        surface: "/ops/schedule",
        blocker: true,
        etaMinutes: 25,
      },
      {
        id: "d7-calendar-sync",
        title: "Sync provider calendars",
        detail:
          "Apple Calendar / Google Calendar two-way sync. Off-hours blocked automatically.",
        owner: "clinician",
        surface: "/ops/staff-schedule",
        blocker: false,
        etaMinutes: 20,
      },
    ],
  },
  {
    day: 8,
    theme: "FHIR bridge + record import",
    exitCriteria: "Conventional EMR data importable; medication reconciliation sandbox green.",
    tasks: [
      {
        id: "d8-fhir-creds",
        title: "Provide FHIR credentials of incumbent EMR",
        detail:
          "OAuth2 / SMART app launch credentials for Epic, Cerner, athena, or Practice Fusion (if applicable).",
        owner: "practice_owner",
        surface: "/ops/fhir-bridge",
        blocker: false,
        etaMinutes: 30,
      },
      {
        id: "d8-test-import",
        title: "Test patient import",
        detail:
          "Pull 5 patient records via FHIR, confirm demographics + meds map. Resolve unmapped fields.",
        owner: "leafjourney_csm",
        surface: "/ops/fhir-bridge",
        blocker: false,
        etaMinutes: 60,
      },
    ],
  },
  {
    day: 9,
    theme: "Marketplace + dispensary linkage (optional)",
    exitCriteria: "Practice can recommend dispensary products without leaving the EMR.",
    tasks: [
      {
        id: "d9-dispensary-pick",
        title: "Pick partnered dispensaries",
        detail:
          "Select up to 5 dispensaries the practice routinely refers to. Combo Wheel deep-links into their menus.",
        owner: "practice_owner",
        surface: "/ops/vendors",
        blocker: false,
        etaMinutes: 20,
      },
      {
        id: "d9-marketplace",
        title: "Enable Seed Trove marketplace (optional)",
        detail:
          "Stand up the practice's branded storefront on Seed Trove. Revenue share + age gate enforced.",
        owner: "practice_owner",
        surface: "/ops/marketplace-benchmark",
        blocker: false,
        etaMinutes: 45,
      },
    ],
  },
  {
    day: 10,
    theme: "Pilot patient #1",
    exitCriteria: "First real patient charted end-to-end, including a dose log and outcome scale.",
    tasks: [
      {
        id: "d10-first-patient",
        title: "Onboard first real patient",
        detail:
          "Practice owner invites a known patient. Intake → APSO → Rx → Combo Wheel → outcome scale.",
        owner: "clinician",
        surface: "/clinic/patients",
        blocker: true,
        etaMinutes: 90,
      },
    ],
  },
  {
    day: 11,
    theme: "Outcomes + research opt-in",
    exitCriteria: "Outcome scales firing, registry opt-in confirmed, first cohort row materialized.",
    tasks: [
      {
        id: "d11-outcomes",
        title: "Confirm outcome scales firing",
        detail:
          "Pain, sleep, anxiety, mood — verify each scale appears at the right cadence in the patient's portal.",
        owner: "operator",
        surface: "/ops/analytics-lab",
        blocker: true,
        etaMinutes: 20,
      },
      {
        id: "d11-registry",
        title: "Opt into Cannabis Outcomes Registry",
        detail:
          "De-identified data shared upstream for RWE. Toggle on if the practice wants to contribute.",
        owner: "practice_owner",
        surface: "/ops/research-exports",
        blocker: false,
        etaMinutes: 10,
      },
    ],
  },
  {
    day: 12,
    theme: "Marketing + landing page",
    exitCriteria: "Public-facing booking link live, first inbound demo request handled.",
    tasks: [
      {
        id: "d12-landing",
        title: "Configure public booking link",
        detail:
          "Per-practice booking URL goes on the website. ICS confirmation + SMS reminder enabled.",
        owner: "operator",
        surface: "/ops/marketing",
        blocker: true,
        etaMinutes: 25,
      },
      {
        id: "d12-listing",
        title: "Add to Leafjourney directory",
        detail:
          "Listed in the public clinician directory; AI compliance match guides the right patients to the right clinic.",
        owner: "leafjourney_csm",
        surface: "/clinicians",
        blocker: false,
        etaMinutes: 15,
      },
    ],
  },
  {
    day: 13,
    theme: "Compliance audit dry-run",
    exitCriteria: "Compliance Audit agent passes; gaps logged.",
    tasks: [
      {
        id: "d13-compliance-audit",
        title: "Run compliance audit",
        detail:
          "AI compliance audit walks the chart, checks Rx documentation, controlled substance reasoning, state form completeness.",
        owner: "compliance",
        surface: "/ops/policies",
        blocker: true,
        etaMinutes: 30,
      },
    ],
  },
  {
    day: 14,
    theme: "Soft launch — internal only",
    exitCriteria: "Practice invites 5 friendly patients; resolves any issues.",
    tasks: [
      {
        id: "d14-soft-launch",
        title: "Invite 5 friendly patients",
        detail:
          "Soft launch with patients who can give honest feedback. Use the feedback icon on every screen.",
        owner: "practice_owner",
        surface: "/portal",
        blocker: true,
        etaMinutes: 60,
      },
    ],
  },
  {
    day: 15,
    theme: "Go live + Day-1 ops",
    exitCriteria: "Public schedule open, patient pipeline filling, first MIPS measure firing.",
    tasks: [
      {
        id: "d15-public-launch",
        title: "Open public schedule",
        detail:
          "Flip the public booking link live. Marketing channels can drive traffic.",
        owner: "practice_owner",
        surface: "/ops/marketing",
        blocker: true,
        etaMinutes: 10,
      },
      {
        id: "d15-mips",
        title: "Confirm MIPS extrapolator firing",
        detail:
          "First measure rows landing. Even at low denominator, the rails are in place for Q1 reporting.",
        owner: "biller",
        surface: "/ops/mips",
        blocker: true,
        etaMinutes: 15,
      },
      {
        id: "d15-launch-call",
        title: "Schedule 30-day check-in",
        detail:
          "Calendar invite for a 30-day post-launch review with CSM. We tune what's not working.",
        owner: "leafjourney_csm",
        surface: "/ops/launch",
        blocker: false,
        etaMinutes: 5,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Scoring + queries — used by the launch agent and the operator surface.
// ---------------------------------------------------------------------------

export type TaskState = "pending" | "in_progress" | "done" | "skipped";

export interface LaunchProgress {
  /** taskId → state */
  states: Record<string, TaskState>;
  startedAt?: string;
}

export function dayCompletion(
  day: number,
  progress: LaunchProgress,
): {
  total: number;
  done: number;
  blockersOpen: number;
  pct: number;
  ready: boolean;
} {
  const d = LAUNCH_PLAN.find((x) => x.day === day);
  if (!d) {
    return { total: 0, done: 0, blockersOpen: 0, pct: 0, ready: false };
  }
  const total = d.tasks.length;
  let done = 0;
  let blockersOpen = 0;
  for (const t of d.tasks) {
    const s = progress.states[t.id];
    if (s === "done" || s === "skipped") done++;
    if (t.blocker && s !== "done") blockersOpen++;
  }
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, blockersOpen, pct, ready: blockersOpen === 0 };
}

export function overallReadiness(progress: LaunchProgress): {
  daysReady: number;
  pct: number;
  totalTasks: number;
  doneTasks: number;
  totalEtaMinutes: number;
  remainingEtaMinutes: number;
} {
  let totalTasks = 0;
  let doneTasks = 0;
  let totalEta = 0;
  let remainingEta = 0;
  let daysReady = 0;
  for (const day of LAUNCH_PLAN) {
    const dc = dayCompletion(day.day, progress);
    if (dc.ready) daysReady++;
    for (const t of day.tasks) {
      totalTasks++;
      totalEta += t.etaMinutes;
      const s = progress.states[t.id];
      if (s === "done" || s === "skipped") doneTasks++;
      else remainingEta += t.etaMinutes;
    }
  }
  return {
    daysReady,
    pct: totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100),
    totalTasks,
    doneTasks,
    totalEtaMinutes: totalEta,
    remainingEtaMinutes: remainingEta,
  };
}

/** Return the next blocker the practice should attack. */
export function nextBlocker(progress: LaunchProgress): {
  day: number;
  task: LaunchTask;
} | null {
  for (const day of LAUNCH_PLAN) {
    for (const t of day.tasks) {
      if (!t.blocker) continue;
      const s = progress.states[t.id];
      if (s !== "done") return { day: day.day, task: t };
    }
  }
  return null;
}
