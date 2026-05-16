import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { recordDailyCheckIn, applyFreezeToken } from "./streaks";
import { prisma } from "@/lib/db/prisma";
import { randomUUID } from "crypto";

describe("Daily Streaks & Freeze Tokens", () => {
  const orgId = `test-org-${randomUUID()}`;
  const patientId = `test-patient-${randomUUID()}`;

  beforeAll(async () => {
    await prisma.organization.create({
      data: { id: orgId, name: "Test Org", slug: orgId }
    });
    await prisma.patient.create({
      data: { id: patientId, organizationId: orgId, firstName: "Test", lastName: "Patient" }
    });
  });

  afterAll(async () => {
    await prisma.freezeToken.deleteMany({ where: { patientId } });
    await prisma.dailyCheckInStreak.deleteMany({ where: { patientId } });
    await prisma.patient.delete({ where: { id: patientId } });
    await prisma.organization.delete({ where: { id: orgId } });
  });

  beforeEach(async () => {
    await prisma.freezeToken.deleteMany({ where: { patientId } });
    await prisma.dailyCheckInStreak.deleteMany({ where: { patientId } });
  });

  it("should create a new streak on first check-in", async () => {
    const result1 = await recordDailyCheckIn(patientId, new Date("2024-01-01T12:00:00Z"));
    const streak1 = result1.streak;
    expect(streak1.currentStreak).toBe(1);
    expect(streak1.longestStreak).toBe(1);
    expect(streak1.lastCheckInDate).toBe("2024-01-01");

    // Next day check-in
    const result2 = await recordDailyCheckIn(patientId, new Date("2024-01-02T12:00:00Z"));
    const streak2 = result2.streak;
    expect(streak2.currentStreak).toBe(2);
    expect(streak2.longestStreak).toBe(2);

    // Skip a day
    const result3 = await recordDailyCheckIn(patientId, new Date("2024-01-04T12:00:00Z"));
    const streak3 = result3.streak;
    expect(streak3.currentStreak).toBe(1); // Reset
    expect(streak3.longestStreak).toBe(2); // Retained
  });

  it("should NOT increment streak if checked in the same day", async () => {
    await recordDailyCheckIn(patientId, new Date("2026-05-16T08:00:00Z"));
    const { streak } = await recordDailyCheckIn(patientId, new Date("2026-05-16T20:00:00Z"));
    expect(streak.currentStreak).toBe(1);
  });

  it("should reset streak if missed a day", async () => {
    await recordDailyCheckIn(patientId, new Date("2026-05-16T12:00:00Z"));
    const { streak } = await recordDailyCheckIn(patientId, new Date("2026-05-18T12:00:00Z"));
    
    expect(streak.currentStreak).toBe(1);
    expect(streak.longestStreak).toBe(1);
  });

  it("should grant a freeze token upon 7 consecutive days", async () => {
    for (let i = 1; i <= 7; i++) {
      const d = new Date(`2026-05-0${i}T12:00:00Z`);
      await recordDailyCheckIn(patientId, d);
    }
    
    const tokens = await prisma.freezeToken.count({ where: { patientId, isUsed: false } });
    expect(tokens).toBe(1);
  });

  it("should repair a broken streak using applyFreezeToken", async () => {
    // 1. Initial check-in
    await recordDailyCheckIn(patientId, new Date("2026-05-16T12:00:00Z"));
    
    // 2. Grant a token manually
    await prisma.freezeToken.create({ data: { patientId, source: "test" } });
    
    // 3. Apply freeze token to repair streak (moves last checkin to 17th)
    const result = await applyFreezeToken(patientId);
    expect(result.ok).toBe(true);

    const updatedStreak = await prisma.dailyCheckInStreak.findUnique({ where: { patientId } });
    expect(updatedStreak?.currentStreak).toBe(2);
    expect(updatedStreak?.lastCheckInDate).toBe("2026-05-17");
  });
});
