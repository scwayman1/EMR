// Telehealth Video Integration — EMR-163
// Video visit support integrated into the encounter workflow.

export type VideoSessionStatus = "waiting" | "in_progress" | "completed" | "failed";

export interface VideoSession {
  id: string;
  encounterId: string;
  patientId: string;
  providerId: string;
  roomUrl: string;
  status: VideoSessionStatus;
  startedAt?: string;
  endedAt?: string;
  duration?: number; // seconds
}

/**
 * Generate a video room URL for a telehealth encounter.
 * In production, this would call Daily.co/Twilio API.
 * For demo, generates a deterministic room URL.
 */
export function generateRoomUrl(encounterId: string): string {
  return `https://leafjourney.daily.co/visit-${encounterId.slice(0, 8)}`;
}

/**
 * Generate a patient-facing join link with a token.
 */
export function generatePatientJoinLink(roomUrl: string, patientName: string): string {
  const token = Buffer.from(`${patientName}:${Date.now()}`).toString("base64").slice(0, 16);
  return `${roomUrl}?token=${token}&name=${encodeURIComponent(patientName)}`;
}

/**
 * Format video session duration as human-readable string.
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

// ── Pre-visit checklist ────────────────────────────────

export interface TelehealthChecklistItem {
  id: string;
  label: string;
  description: string;
  required: boolean;
}

export const PATIENT_CHECKLIST: TelehealthChecklistItem[] = [
  { id: "browser", label: "Using a supported browser", description: "Chrome, Firefox, Safari, or Edge", required: true },
  { id: "camera", label: "Camera is working", description: "Your provider needs to see you", required: true },
  { id: "microphone", label: "Microphone is working", description: "Your provider needs to hear you", required: true },
  { id: "internet", label: "Stable internet connection", description: "Wi-Fi or cellular data", required: true },
  { id: "quiet", label: "In a quiet, private space", description: "For your comfort and privacy", required: false },
  { id: "medications", label: "Medications nearby", description: "Have your current medications visible", required: false },
];
