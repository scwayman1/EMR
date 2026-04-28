import { describe, it, expect } from "vitest";
import { canVendorGoLive } from "./vendor-readiness";
import type { Vendor, VendorDocument } from "@prisma/client";

function makeVendor(overrides: Partial<Vendor> = {}): Vendor {
  return {
    id: "v1",
    organizationId: "org_1",
    slug: "v1",
    name: "Vendor One",
    vendorType: "hemp_brand",
    categories: [],
    productLines: [],
    takeRatePct: 0.1,
    foundingPartnerFlag: false,
    foundingPartnerExpiresAt: null,
    payoutSchedule: "weekly",
    reservePct: 0.1,
    reserveDays: 14,
    shippableStates: ["CA", "NY"],
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
    addressLine1: null,
    addressLine2: null,
    city: null,
    state: null,
    postalCode: null,
    latitude: null,
    longitude: null,
    ...overrides,
  };
}

function makeDoc(overrides: Partial<VendorDocument> = {}): VendorDocument {
  return {
    id: "d1",
    organizationId: "org_1",
    vendorId: "v1",
    documentType: "w9",
    fileUrl: null,
    publicUrl: null,
    expiresAt: null,
    status: "missing",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("canVendorGoLive", () => {
  it("blocks when W-9 is missing", () => {
    const v = makeVendor();
    const result = canVendorGoLive({ ...v, documents: [makeDoc({ status: "missing", fileUrl: null })] });
    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("w9_missing");
  });

  it("blocks when W-9 was submitted but not yet approved", () => {
    const v = makeVendor();
    const result = canVendorGoLive({
      ...v,
      documents: [makeDoc({ status: "submitted", fileUrl: "local-fs:/tmp/foo" })],
    });
    expect(result.blockers).toContain("w9_pending_review");
  });

  it("blocks when W-9 was rejected", () => {
    const v = makeVendor();
    const result = canVendorGoLive({
      ...v,
      documents: [makeDoc({ status: "rejected", fileUrl: "local-fs:/tmp/foo" })],
    });
    expect(result.blockers).toContain("w9_rejected");
  });

  it("blocks when shippableStates is empty (vendor not configured)", () => {
    const v = makeVendor({ shippableStates: [] });
    const result = canVendorGoLive({
      ...v,
      documents: [makeDoc({ status: "approved", fileUrl: "local-fs:/tmp/foo" })],
    });
    expect(result.blockers).toContain("shippable_states_empty");
  });

  it("flags a founding-partner with expired lock and no replacement rate", () => {
    const v = makeVendor({
      foundingPartnerFlag: true,
      foundingPartnerExpiresAt: new Date("2020-01-01"),
      takeRatePct: 0.1,
    });
    const result = canVendorGoLive({
      ...v,
      documents: [makeDoc({ status: "approved", fileUrl: "local-fs:/tmp/foo" })],
    });
    expect(result.blockers).toContain("founding_partner_expired_no_replacement_rate");
  });

  it("ok when W-9 approved + states set + take rate sane", () => {
    const v = makeVendor();
    const result = canVendorGoLive({
      ...v,
      documents: [makeDoc({ status: "approved", fileUrl: "local-fs:/tmp/foo" })],
    });
    expect(result.ok).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });
});
