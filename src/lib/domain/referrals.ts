// Referral Management
// Track outbound and inbound referrals with status.

export type ReferralDirection = "outbound" | "inbound";
export type ReferralStatus = "draft" | "sent" | "received" | "scheduled" | "completed" | "cancelled" | "declined";
export type ReferralPriority = "stat" | "urgent" | "routine";

export interface Referral {
  id: string;
  patientId: string;
  patientName: string;
  direction: ReferralDirection;
  status: ReferralStatus;
  priority: ReferralPriority;

  // Referring provider
  referringProviderName: string;
  referringProviderNpi?: string;
  referringPracticeName: string;

  // Referred-to provider
  referredToProviderName: string;
  referredToSpecialty: string;
  referredToPracticeName: string;
  referredToPhone?: string;
  referredToFax?: string;

  // Clinical
  reason: string;
  diagnosisCodes: { code: string; label: string }[];
  clinicalNotes?: string;
  urgencyNotes?: string;

  // Documents
  attachedDocumentIds: string[];

  // Tracking
  sentAt?: string;
  receivedAt?: string;
  scheduledDate?: string;
  completedAt?: string;
  completionNotes?: string;

  createdAt: string;
  updatedAt: string;
}

// ── Common specialties ─────────────────────────────────

export const SPECIALTIES = [
  "Pain Management",
  "Neurology",
  "Psychiatry",
  "Oncology",
  "Gastroenterology",
  "Rheumatology",
  "Orthopedics",
  "Physical Therapy",
  "Behavioral Health",
  "Palliative Care",
  "Sleep Medicine",
  "Endocrinology",
  "Cardiology",
  "Pulmonology",
  "Dermatology",
  "Primary Care",
  "Addiction Medicine",
  "Integrative Medicine",
  "Acupuncture",
  "Nutrition/Dietetics",
] as const;

export const STATUS_LABELS: Record<ReferralStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600" },
  sent: { label: "Sent", color: "bg-blue-50 text-blue-700" },
  received: { label: "Received", color: "bg-purple-50 text-purple-700" },
  scheduled: { label: "Scheduled", color: "bg-amber-50 text-amber-700" },
  completed: { label: "Completed", color: "bg-emerald-50 text-emerald-700" },
  cancelled: { label: "Cancelled", color: "bg-red-50 text-red-600" },
  declined: { label: "Declined", color: "bg-red-50 text-red-600" },
};
