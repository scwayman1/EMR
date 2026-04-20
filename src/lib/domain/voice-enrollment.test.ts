import { describe, expect, it } from "vitest";
import {
  enrollmentStatusLabel,
  isEnrolled,
  type VoiceEnrollmentLike,
} from "./voice-enrollment";

describe("enrollmentStatusLabel", () => {
  it("labels pending as 'Sample needed'", () => {
    expect(enrollmentStatusLabel("pending")).toBe("Sample needed");
  });

  it("labels enrolled as 'Voice enrolled'", () => {
    expect(enrollmentStatusLabel("enrolled")).toBe("Voice enrolled");
  });

  it("labels failed as 'Enrollment failed'", () => {
    expect(enrollmentStatusLabel("failed")).toBe("Enrollment failed");
  });
});

describe("isEnrolled", () => {
  it("returns false when the enrollment is null (no record yet)", () => {
    expect(isEnrolled(null)).toBe(false);
  });

  it("returns false when status is pending even if enrolledAt is set", () => {
    const v: VoiceEnrollmentLike = {
      status: "pending",
      enrolledAt: new Date(),
    };
    expect(isEnrolled(v)).toBe(false);
  });

  it("returns false when status is enrolled but enrolledAt is null", () => {
    // Defensive: if the DB row got into an inconsistent state we
    // should not claim the user is enrolled.
    const v: VoiceEnrollmentLike = {
      status: "enrolled",
      enrolledAt: null,
    };
    expect(isEnrolled(v)).toBe(false);
  });

  it("returns true when status is enrolled and enrolledAt is set", () => {
    const v: VoiceEnrollmentLike = {
      status: "enrolled",
      enrolledAt: new Date("2026-04-20T12:00:00Z"),
    };
    expect(isEnrolled(v)).toBe(true);
  });

  it("returns false when status is failed regardless of enrolledAt", () => {
    const v: VoiceEnrollmentLike = {
      status: "failed",
      enrolledAt: new Date(),
    };
    expect(isEnrolled(v)).toBe(false);
  });
});
