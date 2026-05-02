import { describe, it, expect } from "vitest";
import {
  checkShippingRestriction,
  checkCartShippingRestrictions,
  defaultShippableStatesForVendorType,
  ALL_US_STATES_AND_DC,
} from "./shipping-restrictions";

const phytoRx = { name: "PhytoRx", shippableStates: [...ALL_US_STATES_AND_DC] };
const ny_dispensary = { name: "Hudson Valley Cannabis", shippableStates: ["NY"] };
const unconfigured = { name: "New Vendor Co.", shippableStates: [] as string[] };

describe("checkShippingRestriction", () => {
  it("permits a state in the vendor's allowlist", () => {
    expect(checkShippingRestriction(phytoRx, "CA").ok).toBe(true);
    expect(checkShippingRestriction(ny_dispensary, "NY").ok).toBe(true);
  });

  it("blocks a state not in the vendor's allowlist with reason and message", () => {
    const result = checkShippingRestriction(ny_dispensary, "CA");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("state_not_permitted");
    expect(result.message).toContain("CA");
    expect(result.message).toContain("Hudson Valley Cannabis");
  });

  it("treats unconfigured vendor as fail-safe blocked, not permitted", () => {
    const result = checkShippingRestriction(unconfigured, "CA");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("vendor_not_configured");
  });

  it("rejects bogus state codes", () => {
    expect(checkShippingRestriction(phytoRx, "ZZ").reason).toBe("invalid_state");
    expect(checkShippingRestriction(phytoRx, "").reason).toBe("invalid_state");
  });

  it("is case-insensitive on the state code", () => {
    expect(checkShippingRestriction(ny_dispensary, "ny").ok).toBe(true);
    expect(checkShippingRestriction(ny_dispensary, "Ny").ok).toBe(true);
  });

  it("permits DC for an all-states hemp vendor", () => {
    expect(checkShippingRestriction(phytoRx, "DC").ok).toBe(true);
  });
});

describe("checkCartShippingRestrictions", () => {
  it("returns ok=true when every item permits the state", () => {
    const result = checkCartShippingRestrictions(
      [
        { productSlug: "a", productName: "A", vendor: phytoRx },
        { productSlug: "b", productName: "B", vendor: phytoRx },
      ],
      "CA",
    );
    expect(result.ok).toBe(true);
    expect(result.blocked).toHaveLength(0);
  });

  it("collects every blocked item rather than short-circuiting", () => {
    const result = checkCartShippingRestrictions(
      [
        { productSlug: "a", productName: "A", vendor: phytoRx },
        { productSlug: "b", productName: "B", vendor: ny_dispensary },
        { productSlug: "c", productName: "C", vendor: unconfigured },
      ],
      "CA",
    );
    expect(result.ok).toBe(false);
    expect(result.blocked).toHaveLength(2);
    expect(result.blocked.map((b) => b.item.productSlug)).toEqual(["b", "c"]);
  });
});

describe("EMR-325 — military / international / territory blocks", () => {
  it("blocks military state codes (AA / AE / AP) regardless of vendor", () => {
    expect(checkShippingRestriction(phytoRx, "AA").reason).toBe("military_address");
    expect(checkShippingRestriction(phytoRx, "AE").reason).toBe("military_address");
    expect(checkShippingRestriction(phytoRx, "AP").reason).toBe("military_address");
  });

  it("blocks APO/FPO/DPO address-line patterns even when state is US", () => {
    const result = checkShippingRestriction(phytoRx, "CA", {
      addressLines: ["Unit 4567", "FPO AP 96321"],
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("military_address");
  });

  it("blocks VA medical center / veterans-affairs address lines", () => {
    const result = checkShippingRestriction(phytoRx, "CA", {
      addressLines: ["Department of Veterans Affairs", "Building 7"],
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("military_address");
  });

  it("blocks U.S. territories (PR / VI / GU / AS / MP)", () => {
    expect(checkShippingRestriction(phytoRx, "PR").reason).toBe("us_territory");
    expect(checkShippingRestriction(phytoRx, "GU").reason).toBe("us_territory");
  });

  it("blocks international country", () => {
    const result = checkShippingRestriction(phytoRx, "CA", { country: "CA" });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("international_address");
  });

  it("permits valid US-state shipments when no restriction triggers", () => {
    const result = checkShippingRestriction(phytoRx, "CA", {
      addressLines: ["123 Main St"],
      country: "US",
    });
    expect(result.ok).toBe(true);
  });
});

describe("defaultShippableStatesForVendorType", () => {
  it("returns all 50 + DC for hemp brands", () => {
    expect(defaultShippableStatesForVendorType("hemp_brand")).toHaveLength(51);
    expect(defaultShippableStatesForVendorType("hemp_brand")).toContain("CA");
    expect(defaultShippableStatesForVendorType("hemp_brand")).toContain("DC");
  });

  it("returns empty array for licensed dispensaries (must be set explicitly)", () => {
    expect(defaultShippableStatesForVendorType("licensed_dispensary")).toEqual([]);
  });
});
