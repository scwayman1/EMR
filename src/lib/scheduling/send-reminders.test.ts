import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock is hoisted; declare shared state with vi.hoisted so the mock
// factories can reach it during hoist time.
const hoisted = vi.hoisted(() => {
  const prisma = {
    appointment: {
      findMany: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };
  return { prisma };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: hoisted.prisma,
}));

import { sendDueAppointmentReminders } from "./send-reminders";
import { getMockSmsAdapter } from "@/lib/sms/adapter";

const { prisma } = hoisted;

const day = 24 * 60 * 60_000;
const NOW = new Date("2026-06-01T12:00:00.000Z");

function makeAppt(overrides: Partial<any> = {}) {
  return {
    id: "appt_1",
    startAt: new Date(NOW.getTime() + 7 * day - 5 * 60_000),
    modality: "video",
    patient: {
      id: "pat_1",
      firstName: "Maya",
      phone: "+15551234567",
      organizationId: "org_1",
    },
    provider: {
      title: "Dr.",
      user: { firstName: "Sanjay", lastName: "Patel" },
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getMockSmsAdapter().reset();
  // Ensure Twilio env vars are not set so getSmsAdapter() returns mock.
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_FROM_NUMBER;
  // Default: no prior reminder sent.
  prisma.auditLog.findMany.mockResolvedValue([]);
  prisma.auditLog.create.mockResolvedValue({});
});

describe("sendDueAppointmentReminders", () => {
  it("sends a 7-day reminder for an appointment within the 7-day window", async () => {
    prisma.appointment.findMany.mockResolvedValue([makeAppt()]);

    const res = await sendDueAppointmentReminders({ now: NOW });

    expect(res.sent).toBe(1);
    expect(res.skipped).toBe(0);
    expect(res.details[0].result).toBe("sent");
    expect(res.details[0].reminderType).toBe("7day");

    const sent = getMockSmsAdapter().getSent();
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("+15551234567");
    expect(sent[0].body).toContain("Maya");
    expect(sent[0].body).toContain("Dr. Sanjay Patel");
    expect(sent[0].body).toContain("next week");

    // Audit row written so we don't double-send.
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({
      action: "sms.appointment.reminder.sent",
      subjectType: "Appointment",
      subjectId: "appt_1",
    });
  });

  it("sends a 2-day reminder when appointment is 2d out", async () => {
    prisma.appointment.findMany.mockResolvedValue([
      makeAppt({
        startAt: new Date(NOW.getTime() + 2 * day - 60_000),
      }),
    ]);

    const res = await sendDueAppointmentReminders({ now: NOW });

    expect(res.sent).toBe(1);
    expect(res.details[0].reminderType).toBe("2day");
    expect(getMockSmsAdapter().getSent()[0].body).toContain("in 2 days");
  });

  it("sends a 1-day reminder when appointment is 1d out", async () => {
    prisma.appointment.findMany.mockResolvedValue([
      makeAppt({
        startAt: new Date(NOW.getTime() + 1 * day - 60_000),
      }),
    ]);

    const res = await sendDueAppointmentReminders({ now: NOW });

    expect(res.sent).toBe(1);
    expect(res.details[0].reminderType).toBe("1day");
    expect(getMockSmsAdapter().getSent()[0].body).toContain("tomorrow");
  });

  it("skips an appointment outside all three target windows", async () => {
    prisma.appointment.findMany.mockResolvedValue([
      makeAppt({
        // 5 days out — between 7d and 2d, no window hits.
        startAt: new Date(NOW.getTime() + 5 * day),
      }),
    ]);

    const res = await sendDueAppointmentReminders({ now: NOW });

    expect(res.sent).toBe(0);
    expect(res.skipped).toBe(1);
    expect(res.details[0].result).toBe("skipped:out-of-window");
    expect(getMockSmsAdapter().getSent()).toHaveLength(0);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("skips a patient with no phone on file", async () => {
    prisma.appointment.findMany.mockResolvedValue([
      makeAppt({
        patient: { ...makeAppt().patient, phone: null },
      }),
    ]);

    const res = await sendDueAppointmentReminders({ now: NOW });

    expect(res.sent).toBe(0);
    expect(res.details[0].result).toBe("skipped:no-phone");
    expect(getMockSmsAdapter().getSent()).toHaveLength(0);
  });

  it("is idempotent — does not resend a reminder already sent for the same type", async () => {
    prisma.appointment.findMany.mockResolvedValue([makeAppt()]);
    prisma.auditLog.findMany.mockResolvedValue([
      { metadata: { reminderType: "7day" } },
    ]);

    const res = await sendDueAppointmentReminders({ now: NOW });

    expect(res.sent).toBe(0);
    expect(res.details[0].result).toBe("skipped:already-sent");
    expect(getMockSmsAdapter().getSent()).toHaveLength(0);
  });

  it("does resend when prior audit row is for a different reminder type", async () => {
    prisma.appointment.findMany.mockResolvedValue([
      makeAppt({
        startAt: new Date(NOW.getTime() + 1 * day - 60_000),
      }),
    ]);
    // Already sent 7day, but now we want the 1day.
    prisma.auditLog.findMany.mockResolvedValue([
      { metadata: { reminderType: "7day" } },
    ]);

    const res = await sendDueAppointmentReminders({ now: NOW });

    expect(res.sent).toBe(1);
    expect(res.details[0].reminderType).toBe("1day");
  });

  it("processes multiple appointments in a single tick", async () => {
    prisma.appointment.findMany.mockResolvedValue([
      makeAppt({ id: "a", startAt: new Date(NOW.getTime() + 7 * day - 60_000) }),
      makeAppt({ id: "b", startAt: new Date(NOW.getTime() + 2 * day - 60_000) }),
      makeAppt({ id: "c", startAt: new Date(NOW.getTime() + 1 * day - 60_000) }),
      makeAppt({ id: "d", startAt: new Date(NOW.getTime() + 5 * day) }),
    ]);

    const res = await sendDueAppointmentReminders({ now: NOW });

    expect(res.sent).toBe(3);
    expect(res.skipped).toBe(1);
    const types = res.details
      .filter((d) => d.result === "sent")
      .map((d) => d.reminderType)
      .sort();
    expect(types).toEqual(["1day", "2day", "7day"]);
  });
});
