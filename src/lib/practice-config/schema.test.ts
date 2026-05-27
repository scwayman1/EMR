import { describe, it, expect } from "vitest";
import { practiceConfigSchema, draftPracticeConfigSchema } from "./schema";

describe("PracticeConfig Schemas", () => {
  it("draft allows missing required fields", () => {
    const result = draftPracticeConfigSchema.safeParse({
      organizationId: "org-1",
    });
    expect(result.success).toBe(true);
  });

  it("draft strictly validates provided fields", () => {
    const result = draftPracticeConfigSchema.safeParse({
      organizationId: "org-1",
      npi: "123", // Invalid length
    });
    expect(result.success).toBe(false);
  });

  it("publish schema requires all fields", () => {
    const result = practiceConfigSchema.safeParse({
      organizationId: "org-1",
    });
    expect(result.success).toBe(false);
  });
});
