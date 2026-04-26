import { describe, it, expect, beforeAll } from "vitest";
import {
  encryptDocument,
  decryptDocument,
  generateMasterKeyHex,
} from "./document-encryption";

beforeAll(() => {
  // Tests need a deterministic-ish master key. Generate fresh per run.
  process.env.DOCUMENT_ENCRYPTION_KEY = generateMasterKeyHex();
});

describe("document encryption", () => {
  it("round-trips a PDF-shaped buffer", () => {
    const plaintext = Buffer.from("%PDF-1.7\nfake-pdf-bytes-for-test");
    const encrypted = encryptDocument(plaintext);
    expect(encrypted.blob.length).toBeGreaterThan(plaintext.length);
    expect(encrypted.sha256Hex).toMatch(/^[0-9a-f]{64}$/);

    const decrypted = decryptDocument(encrypted.blob, encrypted.sha256Hex);
    expect(decrypted.equals(plaintext)).toBe(true);
  });

  it("produces a different blob each time (fresh DEK + IV)", () => {
    const plaintext = Buffer.from("abc");
    const a = encryptDocument(plaintext);
    const b = encryptDocument(plaintext);
    expect(a.blob.equals(b.blob)).toBe(false);
    // But the plaintext SHA matches.
    expect(a.sha256Hex).toBe(b.sha256Hex);
  });

  it("rejects a tampered ciphertext", () => {
    // Plaintext must be long enough that the ciphertext extends past
    // the 88-byte header. 256 bytes of payload is plenty.
    const plaintext = Buffer.alloc(256, 0x41);
    const encrypted = encryptDocument(plaintext);
    const tampered = Buffer.from(encrypted.blob);
    // Flip a bit deep in the ciphertext (past the 88-byte header).
    tampered[150] = tampered[150] ^ 0xff;
    expect(() => decryptDocument(tampered, encrypted.sha256Hex)).toThrow();
  });

  it("rejects a swapped wrapped DEK (AAD binding)", () => {
    const a = encryptDocument(Buffer.from("doc-a"));
    const b = encryptDocument(Buffer.from("doc-b"));
    // Try to decrypt b's payload with a's AAD (sha256). AAD mismatch
    // means the wrapped-DEK auth tag fails before we even try the
    // payload tag.
    expect(() => decryptDocument(b.blob, a.sha256Hex)).toThrow();
  });

  it("rejects a too-short blob", () => {
    expect(() => decryptDocument(Buffer.alloc(10), "0".repeat(64))).toThrow(
      /too short/,
    );
  });

  it("rejects when the plaintext SHA-256 doesn't match the expected hash", () => {
    const encrypted = encryptDocument(Buffer.from("abc"));
    expect(() => decryptDocument(encrypted.blob, "0".repeat(64))).toThrow();
  });
});
