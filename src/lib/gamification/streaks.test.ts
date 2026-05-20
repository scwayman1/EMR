import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import { recordDailyCheckIn, applyFreezeToken } from "./streaks";
import { prisma } from "@/lib/db/prisma";
import { randomUUID } from "crypto";

const dailyCheckInStreakStore = new Map<string, any>();
const freezeTokenStore = new Map<string, any>();

vi.mock("@/lib/db/prisma", () => {
  const dailyCheckInStreakStore = new Map<string, any>();
  const freezeTokenStore = new Map<string, any>();

  return {
    prisma: {
      dailyCheckInStreak: {
        findUnique: vi.fn(async ({ where: { patientId } }) => {
          return dailyCheckInStreakStore.get(patientId) || null;
        }),
        create: vi.fn(async ({ data }) => {
          dailyCheckInStreakStore.set(data.patientId, { ...data });
          return data;
        }),
        update: vi.fn(async ({ where: { patientId }, data }) => {
          const prev = dailyCheckInStreakStore.get(patientId) || {};
          const updated = { ...prev, ...data };
          dailyCheckInStreakStore.set(patientId, updated);
          return updated;
        }),
        deleteMany: vi.fn(async () => {
          dailyCheckInStreakStore.clear();
        }),
      },
      freezeToken: {
        count: vi.fn(async ({ where: { patientId, isUsed } }) => {
          let count = 0;
          for (const token of freezeTokenStore.values()) {
            if (token.patientId === patientId && token.isUsed === isUsed) {
              count++;
            }
          }
          return count;
        }),
        findFirst: vi.fn(async ({ where: { patientId, isUsed } }) => {
          for (const token of freezeTokenStore.values()) {
            if (token.patientId === patientId && token.isUsed === isUsed) {
              return token;
            }
          }
          return null;
        }),
        create: vi.fn(async ({ data }) => {
          const id = `token-${Math.random()}`;
          const token = { id, isUsed: false, ...data, createdAt: new Date() };
          freezeTokenStore.set(id, token);
          return token;
        }),
        update: vi.fn(async ({ where: { id }, data }) => {
          const prev = freezeTokenStore.get(id) || {};
          const updated = { ...prev, ...data };
          freezeTokenStore.set(id, updated);
          return updated;
        }),
        deleteMany: vi.fn(async () => {
          freezeTokenStore.clear();
        }),
      },
      organization: {
        create: vi.fn(async ({ data }) => data),
        delete: vi.fn(async () => {}),
      },
      patient: {
        create: vi.fn(async ({ data }) => data),
        delete: vi.fn(async () => {}),
        findUnique: vi.fn(async ({ where: { id } }) => ({
          id,
          organizationId: "org-123",
          firstName: "Test",
          lastName: "Patient",
          dailyStreak: dailyCheckInStreakStore.get(id) || null,
          patientBadges: [],
        })),
      },
      badge: {
        findMany: vi.fn(async () => []),
        createMany: vi.fn(async () => {}),
      },
      patientBadge: {
        create: vi.fn(async ({ data }) => data),
      },
      $transaction: vi.fn(async (promises) => {
        return Promise.all(promises);
      }),
    },
  };
});

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
  }, 30000);

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
