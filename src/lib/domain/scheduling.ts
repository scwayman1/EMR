// Patient Self-Scheduling — EMR-155
// Patient-facing appointment booking with provider availability.

export type AppointmentType = "new_patient" | "follow_up" | "telehealth" | "urgent";
export type TimeSlotStatus = "available" | "booked" | "blocked";

export interface TimeSlot {
  id: string;
  date: string; // ISO date
  startTime: string; // "09:00"
  endTime: string; // "09:30"
  providerId: string;
  providerName: string;
  type: AppointmentType;
  status: TimeSlotStatus;
  modality: "in_person" | "video" | "phone";
}

export interface AvailabilityRule {
  providerId: string;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  startHour: number; // 9
  endHour: number; // 17
  slotDurationMinutes: number; // 30
  appointmentTypes: AppointmentType[];
  modalities: ("in_person" | "video" | "phone")[];
}

export interface BookingRequest {
  patientId: string;
  providerId: string;
  slotDate: string;
  slotStartTime: string;
  appointmentType: AppointmentType;
  modality: "in_person" | "video" | "phone";
  reason?: string;
}

// ── Default availability ───────────────────────────────

export const DEFAULT_AVAILABILITY: Omit<AvailabilityRule, "providerId">[] = [
  { dayOfWeek: 1, startHour: 9, endHour: 17, slotDurationMinutes: 30, appointmentTypes: ["new_patient", "follow_up", "telehealth"], modalities: ["in_person", "video"] },
  { dayOfWeek: 2, startHour: 9, endHour: 17, slotDurationMinutes: 30, appointmentTypes: ["new_patient", "follow_up", "telehealth"], modalities: ["in_person", "video"] },
  { dayOfWeek: 3, startHour: 9, endHour: 17, slotDurationMinutes: 30, appointmentTypes: ["new_patient", "follow_up", "telehealth"], modalities: ["in_person", "video"] },
  { dayOfWeek: 4, startHour: 9, endHour: 17, slotDurationMinutes: 30, appointmentTypes: ["new_patient", "follow_up", "telehealth"], modalities: ["in_person", "video"] },
  { dayOfWeek: 5, startHour: 9, endHour: 15, slotDurationMinutes: 30, appointmentTypes: ["follow_up", "telehealth"], modalities: ["in_person", "video"] },
];

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, { label: string; duration: number; color: string }> = {
  new_patient: { label: "New patient", duration: 60, color: "bg-accent" },
  follow_up: { label: "Follow-up", duration: 30, color: "bg-blue-500" },
  telehealth: { label: "Telehealth", duration: 30, color: "bg-purple-500" },
  urgent: { label: "Urgent", duration: 15, color: "bg-red-500" },
};

/**
 * Generate available time slots for a given date based on availability rules.
 */
export function generateSlots(
  date: string,
  providerId: string,
  providerName: string,
  rules: Omit<AvailabilityRule, "providerId">[],
  bookedTimes: string[] = []
): TimeSlot[] {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const rule = rules.find((r) => r.dayOfWeek === dayOfWeek);
  if (!rule) return [];

  const slots: TimeSlot[] = [];
  for (let hour = rule.startHour; hour < rule.endHour; hour++) {
    for (let min = 0; min < 60; min += rule.slotDurationMinutes) {
      const startTime = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
      const endMin = min + rule.slotDurationMinutes;
      const endHour = hour + Math.floor(endMin / 60);
      const endTime = `${endHour.toString().padStart(2, "0")}:${(endMin % 60).toString().padStart(2, "0")}`;

      const isBooked = bookedTimes.includes(startTime);

      slots.push({
        id: `${date}-${startTime}-${providerId}`,
        date,
        startTime,
        endTime,
        providerId,
        providerName,
        type: rule.appointmentTypes[0],
        status: isBooked ? "booked" : "available",
        modality: rule.modalities[0],
      });
    }
  }

  return slots;
}
