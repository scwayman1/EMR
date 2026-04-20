import { beforeEach, describe, expect, it } from "vitest";
import {
  STORAGE_PREFIX,
  buildKey,
  clearFormDefaults,
  forgetValue,
  readLastParsed,
  readLastValue,
  rememberValue,
} from "./smart-defaults";

/**
 * Minimal in-memory Storage implementation so we can exercise the
 * helpers under the node-only vitest runtime without jsdom.
 */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
});

describe("buildKey", () => {
  it("builds a versioned namespaced key", () => {
    expect(buildKey("u1", "dose-log", "product")).toBe(
      "defaults:v1:u1:dose-log:product",
    );
  });

  it("exposes the versioning prefix as a stable export", () => {
    expect(STORAGE_PREFIX).toBe("defaults:v1");
  });
});

describe("rememberValue + readLastValue", () => {
  it("round-trips a string value", () => {
    rememberValue("u1", "f1", "product", "flower-og-kush", { storage });
    expect(readLastValue("u1", "f1", "product", { storage })).toBe(
      JSON.stringify("flower-og-kush"),
    );
  });

  it("round-trips a numeric value via JSON serialization", () => {
    rememberValue("u1", "f1", "dose-amount", 2.5, { storage });
    expect(readLastParsed("u1", "f1", "dose-amount", 0, { storage })).toBe(2.5);
  });

  it("round-trips a boolean", () => {
    rememberValue("u1", "f1", "notify", true, { storage });
    expect(readLastParsed("u1", "f1", "notify", false, { storage })).toBe(true);
  });

  it("round-trips an array", () => {
    rememberValue("u1", "f1", "effects", ["calm", "focus"], { storage });
    expect(
      readLastParsed<string[]>("u1", "f1", "effects", [], { storage }),
    ).toEqual(["calm", "focus"]);
  });

  it("round-trips a small object", () => {
    const obj = { route: "oral", unit: "mg" };
    rememberValue("u1", "f1", "dose", obj, { storage });
    expect(readLastParsed("u1", "f1", "dose", {}, { storage })).toEqual(obj);
  });

  it("returns null when no value has been stored", () => {
    expect(readLastValue("u1", "f1", "missing", { storage })).toBeNull();
  });

  it("overwrites prior values on re-remember", () => {
    rememberValue("u1", "f1", "product", "first", { storage });
    rememberValue("u1", "f1", "product", "second", { storage });
    expect(readLastParsed("u1", "f1", "product", null, { storage })).toBe(
      "second",
    );
  });

  it("clears the entry when undefined is stored", () => {
    rememberValue("u1", "f1", "product", "x", { storage });
    rememberValue("u1", "f1", "product", undefined, { storage });
    expect(readLastValue("u1", "f1", "product", { storage })).toBeNull();
  });
});

describe("readLastParsed", () => {
  it("returns fallback when value is missing", () => {
    expect(readLastParsed("u1", "f1", "missing", "fallback", { storage })).toBe(
      "fallback",
    );
  });

  it("returns fallback when stored payload is not valid JSON", () => {
    // Write a raw corrupt value directly to simulate tampering / old data.
    storage.setItem(buildKey("u1", "f1", "field"), "not{json");
    expect(readLastParsed("u1", "f1", "field", "fallback", { storage })).toBe(
      "fallback",
    );
  });
});

describe("cross-form isolation", () => {
  it("does not leak values across different formIds", () => {
    rememberValue("u1", "form-a", "field", "A-value", { storage });
    rememberValue("u1", "form-b", "field", "B-value", { storage });
    expect(readLastParsed("u1", "form-a", "field", null, { storage })).toBe(
      "A-value",
    );
    expect(readLastParsed("u1", "form-b", "field", null, { storage })).toBe(
      "B-value",
    );
  });

  it("does not leak values across different userIds", () => {
    rememberValue("alice", "f1", "field", "alice-val", { storage });
    rememberValue("bob", "f1", "field", "bob-val", { storage });
    expect(readLastParsed("alice", "f1", "field", null, { storage })).toBe(
      "alice-val",
    );
    expect(readLastParsed("bob", "f1", "field", null, { storage })).toBe(
      "bob-val",
    );
  });

  it("does not leak values across different fieldIds within a form", () => {
    rememberValue("u1", "f1", "product", "og-kush", { storage });
    rememberValue("u1", "f1", "amount", "2.5mg", { storage });
    expect(readLastParsed("u1", "f1", "product", null, { storage })).toBe(
      "og-kush",
    );
    expect(readLastParsed("u1", "f1", "amount", null, { storage })).toBe(
      "2.5mg",
    );
  });
});

describe("clearFormDefaults", () => {
  it("removes every field for a given form but preserves sibling forms", () => {
    rememberValue("u1", "dose-log", "product", "og", { storage });
    rememberValue("u1", "dose-log", "amount", 2.5, { storage });
    rememberValue("u1", "intake", "pain", 7, { storage });

    const removed = clearFormDefaults("u1", "dose-log", { storage });
    expect(removed).toBe(2);

    expect(readLastValue("u1", "dose-log", "product", { storage })).toBeNull();
    expect(readLastValue("u1", "dose-log", "amount", { storage })).toBeNull();
    // Sibling form is untouched.
    expect(readLastParsed("u1", "intake", "pain", null, { storage })).toBe(7);
  });

  it("does not clear another user's defaults for the same formId", () => {
    rememberValue("alice", "dose-log", "product", "alice-prod", { storage });
    rememberValue("bob", "dose-log", "product", "bob-prod", { storage });

    clearFormDefaults("alice", "dose-log", { storage });
    expect(
      readLastValue("alice", "dose-log", "product", { storage }),
    ).toBeNull();
    expect(readLastParsed("bob", "dose-log", "product", null, { storage })).toBe(
      "bob-prod",
    );
  });

  it("returns 0 when no matching keys exist", () => {
    expect(clearFormDefaults("u1", "nothing-here", { storage })).toBe(0);
  });
});

describe("forgetValue", () => {
  it("removes a single field without affecting others", () => {
    rememberValue("u1", "f1", "a", 1, { storage });
    rememberValue("u1", "f1", "b", 2, { storage });
    forgetValue("u1", "f1", "a", { storage });
    expect(readLastValue("u1", "f1", "a", { storage })).toBeNull();
    expect(readLastParsed("u1", "f1", "b", 0, { storage })).toBe(2);
  });
});

describe("storage unavailable", () => {
  it("reads return null when storage is null", () => {
    expect(
      readLastValue("u1", "f1", "field", { storage: null }),
    ).toBeNull();
    expect(
      readLastParsed("u1", "f1", "field", "fallback", { storage: null }),
    ).toBe("fallback");
  });

  it("writes silently no-op when storage is null", () => {
    expect(() =>
      rememberValue("u1", "f1", "field", "v", { storage: null }),
    ).not.toThrow();
    expect(() =>
      clearFormDefaults("u1", "f1", { storage: null }),
    ).not.toThrow();
    expect(() =>
      forgetValue("u1", "f1", "field", { storage: null }),
    ).not.toThrow();
  });
});
