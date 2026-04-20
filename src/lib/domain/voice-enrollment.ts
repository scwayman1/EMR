/**
 * Voice enrollment — pure domain helpers.
 *
 * The VoiceEnrollment row tracks a user's progress toward having a
 * speaker profile stored with whatever diarization provider we wire
 * up later (Azure Speaker Recognition, AssemblyAI, pyannote). This
 * module stays provider-agnostic: it just maps status values to
 * display labels and reports whether an enrollment is complete.
 *
 * Keep this file free of Prisma / network / React so it remains
 * trivially unit-testable.
 */

export type VoiceEnrollmentStatus = "pending" | "enrolled" | "failed";

/**
 * Minimal shape the helpers need. Declared locally so tests don't
 * have to pull in the full generated Prisma type.
 */
export interface VoiceEnrollmentLike {
  status: VoiceEnrollmentStatus;
  enrolledAt: Date | null;
}

/**
 * Human-readable label for a status. Used by the wizard + any future
 * admin dashboards. Keep these short — they render inside pills.
 */
export function enrollmentStatusLabel(status: VoiceEnrollmentStatus): string {
  switch (status) {
    case "pending":
      return "Sample needed";
    case "enrolled":
      return "Voice enrolled";
    case "failed":
      return "Enrollment failed";
  }
}

/**
 * True when the user has successfully completed enrollment — i.e.
 * the record exists, status is "enrolled", and enrolledAt is set.
 * Callers can safely treat a null enrollment as "not enrolled yet."
 */
export function isEnrolled(v: VoiceEnrollmentLike | null): boolean {
  if (!v) return false;
  return v.status === "enrolled" && v.enrolledAt !== null;
}
