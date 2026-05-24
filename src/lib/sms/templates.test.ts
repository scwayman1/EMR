import { describe, expect, it } from "vitest";
import {
  pickReminderOffset,
  renderAppointmentReminder,
} from "./templates";

const day = 24 * 60 * 60_000;
const tick = 15 * 60_000;

describe("pickReminderOffset", () => {
  it("matches 7-day window at the boundary", () => {
    expect(pickReminderOffset(7 * day)).toBe("7day");
    expect(pickReminderOffset(7 * day - 1)).toBe("7day");
    expect(pickReminderOffset(7 * day - tick + 1)).toBe("7day");
  });

  it("matches 2-day window", () => {
    expect(pickReminderOffset(2 * day)).toBe("2day");
    expect(pickReminderOffset(2 * day - 60_000)).toBe("2day");
  });

  it("matches 1-day window", () => {
    expect(pickReminderOffset(1 * day)).toBe("1day");
    expect(pickReminderOffset(1 * day - 60_000)).toBe("1day");
  });

  it("returns null between target windows", () => {
    expect(pickReminderOffset(3 * day)).toBeNull();
    expect(pickReminderOffset(5 * day)).toBeNull();
    expect(pickReminderOffset(6 * day)).toBeNull();
    // Just past the 7d window, before the next bucket begins.
    expect(pickReminderOffset(7 * day + 60_000)).toBeNull();
    // Just past the 1d window — well outside the 1d tick.
    expect(pickReminderOffset(0.5 * day)).toBeNull();
  });

  it("honors a custom tick interval", () => {
    // With a 60-minute tick, an appointment 6d23h05m away still counts as 7d.
    const sixDays23HoursIsh = 7 * day - 55 * 60_000;
    expect(pickReminderOffset(sixDays23HoursIsh, 60 * 60_000)).toBe("7day");
    // With the default 15-min tick, the same offset is too far out.
    expect(pickReminderOffset(sixDays23HoursIsh)).toBeNull();
  });

  it("returns null for past appointments", () => {
    expect(pickReminderOffset(-1)).toBeNull();
    expect(pickReminderOffset(-1000)).toBeNull();
  });
});

describe("renderAppointmentReminder", () => {
  const baseInput = {
    patientFirstName: "Maya",
    providerName: "Dr. Patel",
    appointmentAt: new Date("2026-06-01T15:30:00Z"),
    modality: "video",
    timezone: "UTC",
  };

  it("renders the 7-day reminder with the right cadence phrase", () => {
    const body = renderAppointmentReminder("7day", baseInput);
    expect(body).toContain("Maya");
    expect(body).toContain("Dr. Patel");
    expect(body).toContain("next week");
    expect(body).toContain("video visit");
  });

  it("renders the 2-day reminder", () => {
    const body = renderAppointmentReminder("2day", baseInput);
    expect(body).toContain("in 2 days");
  });

  it("renders the 1-day reminder with tomorrow framing", () => {
    const body = renderAppointmentReminder("1day", baseInput);
    expect(body).toContain("tomorrow");
  });

  it("includes the default reply-to-confirm tail when no URL is provided", () => {
    const body = renderAppointmentReminder("1day", baseInput);
    expect(body).toMatch(/Reply C to confirm/);
  });

  it("uses a reschedule URL when provided", () => {
    const body = renderAppointmentReminder("1day", {
      ...baseInput,
      rescheduleUrl: "https://lj.example/r/abc",
    });
    expect(body).toContain("https://lj.example/r/abc");
    expect(body).not.toMatch(/Reply C to confirm/);
  });

  it("falls back gracefully on a missing patient name", () => {
    const body = renderAppointmentReminder("1day", {
      ...baseInput,
      patientFirstName: "",
    });
    expect(body).toContain("Hi there");
  });

  it("varies modality copy by channel", () => {
    expect(renderAppointmentReminder("1day", { ...baseInput, modality: "video" })).toContain(
      "video visit",
    );
    expect(
      renderAppointmentReminder("1day", { ...baseInput, modality: "in_person" }),
    ).toContain("in-person visit");
    expect(renderAppointmentReminder("1day", { ...baseInput, modality: "phone" })).toContain(
      "phone visit",
    );
  });
});
