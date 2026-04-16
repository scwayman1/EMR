// Shared domain types for: training modules, incident reports, vendors,
// feature flags, heatmap data, adverse events — collapsed into one file
// for quick overnight batch deployment.

// ── Training Modules ──────────────────────────────────
export type TrainingStatus = "not_started" | "in_progress" | "complete";

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  category: "clinical" | "compliance" | "operations" | "soft_skills";
  required: boolean;
  status: TrainingStatus;
  completedAt?: string;
}

export const DEFAULT_TRAINING: TrainingModule[] = [
  { id: "tr-1", title: "HIPAA Basics", description: "Understanding protected health information", durationMinutes: 30, category: "compliance", required: true, status: "not_started" },
  { id: "tr-2", title: "Cannabis Dosing Fundamentals", description: "Start low, go slow principles", durationMinutes: 45, category: "clinical", required: true, status: "not_started" },
  { id: "tr-3", title: "Drug Interaction Screening", description: "Cannabis + common Rx", durationMinutes: 30, category: "clinical", required: true, status: "not_started" },
  { id: "tr-4", title: "Patient Communication", description: "Motivational interviewing basics", durationMinutes: 60, category: "soft_skills", required: false, status: "not_started" },
  { id: "tr-5", title: "EMR Navigation", description: "Using Leafjourney efficiently", durationMinutes: 45, category: "operations", required: true, status: "not_started" },
  { id: "tr-6", title: "State Compliance", description: "Your state's cannabis regulations", durationMinutes: 30, category: "compliance", required: true, status: "not_started" },
];

// ── Incident Reports ──────────────────────────────────
export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentCategory = "medication_error" | "adverse_event" | "privacy" | "safety" | "equipment" | "other";

export interface IncidentReport {
  id: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  title: string;
  description: string;
  patientAffected: boolean;
  reportedBy: string;
  reportedAt: string;
  resolvedAt?: string;
  resolution?: string;
}

export const INCIDENT_CATEGORY_LABELS: Record<IncidentCategory, string> = {
  medication_error: "Medication Error",
  adverse_event: "Adverse Event",
  privacy: "Privacy / HIPAA",
  safety: "Safety",
  equipment: "Equipment",
  other: "Other",
};

// ── Vendors ──────────────────────────────────────────
export interface Vendor {
  id: string;
  name: string;
  category: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  contractEnds?: string;
  monthlyCost?: number;
  active: boolean;
  notes?: string;
}

// ── Feature flags ────────────────────────────────────
export interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  category: "experimental" | "ai" | "billing" | "integrations" | "compliance";
}

export const DEFAULT_FLAGS: FeatureFlag[] = [
  { key: "voice_chart", label: "Voice-to-Chart", description: "Ambient documentation with AI extraction", enabled: true, category: "ai" },
  { key: "chatcb_live_pubmed", label: "ChatCB Live PubMed", description: "Live PubMed search on Education tab", enabled: true, category: "ai" },
  { key: "clerk_auth", label: "Clerk Authentication", description: "Use Clerk instead of iron-session", enabled: false, category: "experimental" },
  { key: "hipaa_mode", label: "HIPAA Mode", description: "Strict session TTLs, required MFA", enabled: false, category: "compliance" },
  { key: "marketplace", label: "Marketplace", description: "Physician-curated product shop", enabled: true, category: "integrations" },
  { key: "real_telehealth", label: "Daily.co Video", description: "Real Daily.co video room creation", enabled: false, category: "integrations" },
  { key: "experimental_agents", label: "Experimental AI agents", description: "Enable beta agent features", enabled: false, category: "experimental" },
  { key: "automated_billing", label: "Automated billing submissions", description: "Auto-submit clean claims", enabled: false, category: "billing" },
];

// ── Heatmap ──────────────────────────────────────────
export interface HeatmapCell {
  date: string; // ISO date
  value: number; // 0-10 scale
  hasData: boolean;
}

export function generateHeatmapData(days: number, pattern: "improving" | "worsening" | "mixed" = "mixed"): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const hasData = Math.random() > 0.15;
    let value = 5;
    if (hasData) {
      if (pattern === "improving") value = Math.max(1, Math.min(10, 7 - Math.floor(i / 7) + Math.floor(Math.random() * 3)));
      else if (pattern === "worsening") value = Math.max(1, Math.min(10, 3 + Math.floor(i / 7) + Math.floor(Math.random() * 3)));
      else value = Math.floor(Math.random() * 10) + 1;
    }
    cells.push({ date: d.toISOString().slice(0, 10), value, hasData });
  }
  return cells;
}

// ── Adverse Events ────────────────────────────────────
export interface AdverseEvent {
  id: string;
  patientId: string;
  event: string;
  severity: "mild" | "moderate" | "severe";
  reportedAt: string;
  causalityAssessment: "probable" | "possible" | "unlikely" | "unassessed";
  productsInvolved: string[];
  action: string;
}

export const ADVERSE_EVENT_TYPES = [
  "Dizziness", "Drowsiness", "Dry mouth", "Anxiety", "Paranoia",
  "Rapid heart rate", "Nausea", "Headache", "Rash", "Appetite change",
  "Sleep disturbance", "Cognitive effects", "Orthostatic hypotension",
] as const;
