import { describe, expect, it } from "vitest";
import {
  plainLanguageSummaryFor,
  selectDeliveryChannels,
  toneForCycle,
  aggregateStatement,
} from "./generator";

describe("selectDeliveryChannels", () => {
  const base = {
    smsOptIn: true,
    emailOptIn: true,
    hasEmail: true,
    hasPhone: true,
    portalActive: true,
  };

  it("first cycle: portal preferred when active", () => {
    expect(selectDeliveryChannels({ ...base, cycle: "first" })).toEqual(["portal"]);
  });

  it("first cycle: falls back to email when portal inactive", () => {
    expect(selectDeliveryChannels({ ...base, portalActive: false, cycle: "first" })).toEqual(["email"]);
  });

  it("first cycle: falls back to SMS, then mail", () => {
    expect(
      selectDeliveryChannels({ ...base, portalActive: false, hasEmail: false, cycle: "first" }),
    ).toEqual(["sms"]);
    expect(
      selectDeliveryChannels({
        smsOptIn: false,
        emailOptIn: false,
        hasEmail: false,
        hasPhone: false,
        portalActive: false,
        cycle: "first",
      }),
    ).toEqual(["mail"]);
  });

  it("monthly cycle: fans out to portal + email + SMS", () => {
    expect(selectDeliveryChannels({ ...base, cycle: "monthly" })).toEqual(["portal", "email", "sms"]);
  });

  it("final_notice always includes mail", () => {
    const channels = selectDeliveryChannels({ ...base, cycle: "final_notice" });
    expect(channels[channels.length - 1]).toBe("mail");
    expect(channels).toContain("portal");
    expect(channels).toContain("email");
    expect(channels).toContain("sms");
  });
});

describe("toneForCycle", () => {
  it("maps cycle → tone", () => {
    expect(toneForCycle("first")).toBe("friendly");
    expect(toneForCycle("monthly")).toBe("reminder");
    expect(toneForCycle("final_notice")).toBe("firm");
  });
});

describe("plainLanguageSummaryFor", () => {
  const agg = aggregateStatement({
    lineItems: [{ description: "Office visit", amountCents: 15000, encounterId: null, cptCode: null, serviceDate: new Date() }],
    insurancePaidCents: 9600,
    adjustmentsCents: 3000,
    priorBalanceCents: 0,
    paidToDateCents: 0,
  });

  it("friendly tone matches the deterministic baseline", () => {
    const out = plainLanguageSummaryFor({
      patientFirstName: "Jane",
      agg,
      dueDate: new Date(Date.UTC(2026, 4, 30)),
      tone: "friendly",
    });
    expect(out).toContain("Hi Jane");
    expect(out).not.toContain("monthly reminder");
  });

  it("reminder tone injects the monthly-reminder phrase", () => {
    const out = plainLanguageSummaryFor({
      patientFirstName: "Jane",
      agg,
      dueDate: new Date(Date.UTC(2026, 4, 30)),
      tone: "reminder",
    });
    expect(out).toContain("monthly reminder");
  });

  it("firm tone appends the collections consequence sentence", () => {
    const out = plainLanguageSummaryFor({
      patientFirstName: "Jane",
      agg,
      dueDate: new Date(Date.UTC(2026, 4, 30)),
      tone: "firm",
    });
    expect(out).toContain("collection");
    expect(out).toContain("14 days");
  });
});
