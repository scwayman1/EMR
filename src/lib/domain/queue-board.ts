// Queue Board — real-time patient flow for front desk
// Read-only view; encounter state transitions are still owned by the chart.

export type QueueStatus = "scheduled" | "arrived" | "rooming" | "in_visit" | "checkout" | "completed";

export interface QueueEntry {
  encounterId: string;
  patientId: string;
  patientName: string;
  scheduledFor: string;
  status: QueueStatus;
  provider?: string;
  modality: "in_person" | "video" | "phone";
  reason?: string;
  minutesWaiting?: number;
  room?: string;
}

export const QUEUE_STATUS_CONFIG: Record<QueueStatus, { label: string; color: string; order: number }> = {
  scheduled: { label: "Scheduled", color: "bg-gray-100 text-gray-600", order: 1 },
  arrived: { label: "Checked in", color: "bg-blue-100 text-blue-700", order: 2 },
  rooming: { label: "In room", color: "bg-purple-100 text-purple-700", order: 3 },
  in_visit: { label: "With provider", color: "bg-emerald-100 text-emerald-700", order: 4 },
  checkout: { label: "Checking out", color: "bg-amber-100 text-amber-700", order: 5 },
  completed: { label: "Done", color: "bg-gray-100 text-gray-500", order: 6 },
};

export function calculateWaitTime(scheduledFor: string, status: QueueStatus): number | null {
  if (status === "completed") return null;
  const scheduled = new Date(scheduledFor).getTime();
  const now = Date.now();
  return Math.max(0, Math.round((now - scheduled) / 60000));
}
