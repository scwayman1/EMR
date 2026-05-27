// Static catalogues used by EMR-424 wizard steps 6–8 to render
// "all known templates" pickers. Until EMR-431 ships a real
// versioned template registry, this file is the source of truth
// for the IDs that admins can toggle on/off.
//
// Compiled from the union of slugs referenced by the three v1
// specialty manifests in src/lib/specialty-templates/manifests/.
// Adding a new manifest? Add any new IDs it references here too,
// otherwise the wizard will not let admins re-enable defaults
// after they untick them.

export type KnownTemplate = {
  id: string;
  label: string;
  description: string;
};

export type KnownRole = {
  id: string;
  label: string;
  description: string;
  defaultPermissions: string[];
};

// ---------------------------------------------------------------------------
// Workflows — union of `default_workflows` across the three v1 manifests.
// ---------------------------------------------------------------------------

export const KNOWN_WORKFLOWS: KnownTemplate[] = [
  {
    id: "new-patient-intake",
    label: "New patient intake",
    description:
      "Initial registration, history capture, and insurance verification.",
  },
  {
    id: "annual-wellness",
    label: "Annual wellness visit",
    description:
      "Yearly preventive screening, risk assessment, and care plan refresh.",
  },
  {
    id: "chronic-condition-followup",
    label: "Chronic condition follow-up",
    description: "Recurring visit cadence for ongoing disease management.",
  },
  {
    id: "lab-review",
    label: "Lab review",
    description: "Reviewing pending lab results and acting on abnormals.",
  },
  {
    id: "medication-reconciliation",
    label: "Medication reconciliation",
    description: "Reconciling reported vs. prescribed medications at each visit.",
  },
  {
    id: "new-pain-consult",
    label: "New pain consult",
    description: "Initial interventional pain consult with functional assessment.",
  },
  {
    id: "pain-followup",
    label: "Pain follow-up",
    description: "Ongoing pain follow-up: scoring, function, and treatment plan.",
  },
  {
    id: "procedure-note",
    label: "Procedure visit",
    description: "Procedural visit with intra-op note and post-procedure care.",
  },
  {
    id: "imaging-review",
    label: "Imaging review",
    description: "Reviewing imaging studies and correlating with clinical findings.",
  },
  {
    id: "medication-review",
    label: "Medication review",
    description: "Targeted review of pain or controlled-substance regimens.",
  },
  {
    id: "cannabis-certification",
    label: "Cannabis certification visit",
    description: "Initial certification and qualifying-condition documentation.",
  },
  {
    id: "dosing-titration",
    label: "Dosing titration",
    description: "Structured titration of cannabinoid dose and ratio.",
  },
  {
    id: "outcome-followup",
    label: "Outcome follow-up",
    description: "Longitudinal outcome check-in with per-product efficacy.",
  },
];

// ---------------------------------------------------------------------------
// Charting templates — union of `default_charting_templates` across manifests.
// ---------------------------------------------------------------------------

export const KNOWN_CHARTING: KnownTemplate[] = [
  {
    id: "soap-note",
    label: "SOAP note",
    description: "Subjective, Objective, Assessment, Plan — primary-care default.",
  },
  {
    id: "annual-wellness-note",
    label: "Annual wellness note",
    description: "Structured annual-visit note with screening and counseling sections.",
  },
  {
    id: "problem-focused-note",
    label: "Problem-focused note",
    description: "Single-issue follow-up note for chronic-condition visits.",
  },
  {
    id: "pain-consult",
    label: "Pain consult note",
    description: "Initial pain-consult template with PMH, exam, imaging, and plan.",
  },
  {
    id: "pain-followup",
    label: "Pain follow-up note",
    description: "Pain-follow-up template emphasising scores, function, and PDMP.",
  },
  {
    id: "procedure-note",
    label: "Procedure note",
    description: "Pre / intra / post-op procedure documentation.",
  },
  {
    id: "cannabis-certification-note",
    label: "Cannabis certification note",
    description: "Structured certification note with qualifying conditions and consent.",
  },
  {
    id: "followup-note",
    label: "Cannabis follow-up note",
    description: "Follow-up note with dose titration and per-product outcomes.",
  },
];

// ---------------------------------------------------------------------------
// Roles — v1 catalogue with default permission groups per role.
// Permission groups are stub strings; EMR-441 will replace these with a real
// permission schema. Keep the IDs stable since they're persisted (encoded
// inside the role-overrides JSON — see step-8-apply-roles.tsx).
// ---------------------------------------------------------------------------

export const KNOWN_PERMISSION_GROUPS: Record<string, string> = {
  "chart-read": "Read patient charts",
  "chart-write": "Write to patient charts",
  prescribe: "Prescribe medications",
  "prescribe-controlled": "Prescribe controlled substances",
  "schedule-view": "View the schedule",
  "schedule-write": "Manage the schedule",
  "billing-view": "View billing data",
  "billing-write": "Edit billing / claims",
  "labs-order": "Order labs",
  "labs-result": "Resolve lab results",
  "messages-read": "Read patient messages",
  "messages-write": "Reply to patient messages",
  "rooming": "Room patients and capture vitals",
  "user-admin": "Manage staff users and roles",
  "config-admin": "Edit practice configuration",
  "patient-portal": "Patient portal access",
  "patient-self-data": "View own records",
};

export const KNOWN_ROLES: KnownRole[] = [
  {
    id: "practice-admin",
    label: "Practice admin",
    description:
      "Configures the practice, manages users, and oversees billing.",
    defaultPermissions: [
      "user-admin",
      "config-admin",
      "schedule-view",
      "schedule-write",
      "billing-view",
      "billing-write",
    ],
  },
  {
    id: "physician",
    label: "Physician",
    description:
      "Sees patients, charts, prescribes, and signs off on care.",
    defaultPermissions: [
      "chart-read",
      "chart-write",
      "prescribe",
      "schedule-view",
      "labs-order",
      "labs-result",
      "messages-write",
    ],
  },
  {
    id: "nurse",
    label: "Nurse",
    description:
      "Triage, rooming, charting support, and patient messaging.",
    defaultPermissions: [
      "chart-read",
      "chart-write",
      "rooming",
      "schedule-view",
      "messages-read",
      "messages-write",
    ],
  },
  {
    id: "medical-assistant",
    label: "Medical assistant",
    description:
      "Rooms patients, captures vitals, and supports clinic flow.",
    defaultPermissions: [
      "chart-read",
      "rooming",
      "schedule-view",
      "messages-read",
    ],
  },
  {
    id: "front-desk",
    label: "Front desk",
    description:
      "Schedules visits, handles intake, and manages patient communication.",
    defaultPermissions: [
      "schedule-view",
      "schedule-write",
      "messages-read",
      "messages-write",
      "billing-view",
    ],
  },
  {
    id: "patient",
    label: "Patient",
    description: "Accesses their own portal, records, and messages.",
    defaultPermissions: [
      "patient-portal",
      "patient-self-data",
      "messages-read",
      "messages-write",
    ],
  },
];
