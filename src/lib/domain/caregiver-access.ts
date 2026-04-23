// Caregiver Access — multi-account sharing for family/caregivers
// Let patients grant read-only or full access to their chart.

export type AccessLevel = "read_only" | "full" | "emergency_only";
export type CaregiverStatus = "invited" | "active" | "revoked" | "expired";

export interface CaregiverInvite {
  id: string;
  patientId: string;
  caregiverEmail: string;
  caregiverName: string;
  relationship: string;
  accessLevel: AccessLevel;
  status: CaregiverStatus;
  invitedAt: string;
  acceptedAt?: string;
  revokedAt?: string;
  expiresAt?: string;
}

export const RELATIONSHIPS = [
  "Spouse/Partner",
  "Parent",
  "Child (adult)",
  "Sibling",
  "Legal guardian",
  "Power of attorney",
  "Home health aide",
  "Other family member",
  "Other caregiver",
] as const;

export const ACCESS_LEVELS: Record<AccessLevel, { label: string; description: string; icon: string }> = {
  read_only: { label: "View only", description: "Can view health records, appointments, and medications but cannot make changes", icon: "Eye" },
  full: { label: "Full access", description: "Can view records, send messages, schedule appointments, and manage medications", icon: "Key" },
  emergency_only: { label: "Emergency only", description: "Can only access records in a medical emergency via time-limited link", icon: "Alert" },
};

export const STATUS_STYLES: Record<CaregiverStatus, { color: string; label: string }> = {
  invited: { color: "bg-blue-50 text-blue-700", label: "Pending" },
  active: { color: "bg-emerald-50 text-emerald-700", label: "Active" },
  revoked: { color: "bg-red-50 text-red-600", label: "Revoked" },
  expired: { color: "bg-gray-100 text-gray-600", label: "Expired" },
};
