// Notifications System
// In-app notification center with preference management.

export type NotificationType =
  | "appointment_reminder"
  | "message_received"
  | "lab_results"
  | "prescription_ready"
  | "care_plan_update"
  | "assessment_due"
  | "dosing_reminder"
  | "billing_statement"
  | "agent_approval"
  | "system";

export type NotificationChannel = "in_app" | "email" | "sms";
export type NotificationPriority = "urgent" | "normal" | "low";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  href?: string; // Link to navigate to
  read: boolean;
  readAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreference {
  type: NotificationType;
  channels: NotificationChannel[];
  enabled: boolean;
}

// ── Display config ─────────────────────────────────────

export const NOTIFICATION_CONFIG: Record<NotificationType, {
  label: string;
  icon: string;
  defaultChannels: NotificationChannel[];
  color: string;
}> = {
  appointment_reminder: { label: "Appointment reminders", icon: "Cal", defaultChannels: ["in_app", "email", "sms"], color: "text-blue-600" },
  message_received: { label: "New messages", icon: "Msg", defaultChannels: ["in_app", "email"], color: "text-accent" },
  lab_results: { label: "Lab results available", icon: "Lab", defaultChannels: ["in_app", "email"], color: "text-purple-600" },
  prescription_ready: { label: "Prescription updates", icon: "Rx", defaultChannels: ["in_app", "sms"], color: "text-emerald-600" },
  care_plan_update: { label: "Care plan changes", icon: "Plan", defaultChannels: ["in_app"], color: "text-amber-600" },
  assessment_due: { label: "Assessment reminders", icon: "Chk", defaultChannels: ["in_app", "email"], color: "text-indigo-600" },
  dosing_reminder: { label: "Dosing reminders", icon: "Dose", defaultChannels: ["in_app", "sms"], color: "text-teal-600" },
  billing_statement: { label: "Billing notifications", icon: "$", defaultChannels: ["in_app", "email"], color: "text-orange-600" },
  agent_approval: { label: "Approval requests", icon: "AI", defaultChannels: ["in_app"], color: "text-rose-600" },
  system: { label: "System notifications", icon: "Sys", defaultChannels: ["in_app"], color: "text-text-muted" },
};

export function getDefaultPreferences(): NotificationPreference[] {
  return Object.entries(NOTIFICATION_CONFIG).map(([type, config]) => ({
    type: type as NotificationType,
    channels: config.defaultChannels,
    enabled: true,
  }));
}
