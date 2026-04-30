import { describe, expect, it } from "vitest";
import {
  AFFILIATE_PARTNERS,
  decorateAffiliateUrl,
  listAffiliatePartners,
} from "./partners";

describe("affiliate partners registry", () => {
  it("includes the three Dr. Patel partners", () => {
    const slugs = AFFILIATE_PARTNERS.map((p) => p.slug);
    expect(slugs).toContain("phytorx");
    expect(slugs).toContain("flower-powered-products");
    expect(slugs).toContain("aulv");
  });

  it("listAffiliatePartners returns only active, sorted by sortOrder", () => {
    const list = listAffiliatePartners();
    for (let i = 1; i < list.length; i++) {
      expect(list[i].sortOrder).toBeGreaterThanOrEqual(list[i - 1].sortOrder);
    }
    expect(list.every((p) => p.status === "active")).toBe(true);
  });

  it("every partner ships a disclaimer + joint decision note", () => {
    for (const p of AFFILIATE_PARTNERS) {
      expect(p.disclaimerText.length).toBeGreaterThan(20);
      expect(p.jointDecisionNote.length).toBeGreaterThan(20);
    }
  });
});

describe("decorateAffiliateUrl", () => {
  it("appends utm_source and utm_medium when missing", () => {
    const decorated = decorateAffiliateUrl({
      slug: "x",
      name: "X",
      domain: "example.com",
      websiteUrl: "https://example.com/page",
      description: "",
      category: "",
      status: "active",
      disclaimerText: "",
      jointDecisionNote: "",
      utmSource: "leafjourney",
      sortOrder: 0,
    });
    expect(decorated).toContain("utm_source=leafjourney");
    expect(decorated).toContain("utm_medium=affiliate");
  });

  it("does not overwrite existing utm params", () => {
    const decorated = decorateAffiliateUrl({
      slug: "x",
      name: "X",
      domain: "example.com",
      websiteUrl: "https://example.com/?utm_source=other",
      description: "",
      category: "",
      status: "active",
      disclaimerText: "",
      jointDecisionNote: "",
      utmSource: "leafjourney",
      sortOrder: 0,
    });
    expect(decorated).toContain("utm_source=other");
    expect(decorated).not.toContain("utm_source=leafjourney");
  });

  it("returns raw url when utmSource missing", () => {
    const url = decorateAffiliateUrl({
      slug: "x",
      name: "X",
      domain: "example.com",
      websiteUrl: "https://example.com",
      description: "",
      category: "",
      status: "active",
      disclaimerText: "",
      jointDecisionNote: "",
      utmSource: "",
      sortOrder: 0,
    });
    expect(url).toBe("https://example.com");
  });

  it("returns raw url when input is malformed", () => {
    const url = decorateAffiliateUrl({
      slug: "x",
      name: "X",
      domain: "example.com",
      websiteUrl: "not a url",
      description: "",
      category: "",
      status: "active",
      disclaimerText: "",
      jointDecisionNote: "",
      utmSource: "leafjourney",
      sortOrder: 0,
    });
    expect(url).toBe("not a url");
  });
});
