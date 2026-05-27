// EMR-033 — at-rest envelope for provider-to-provider message bodies.
//
// Provider↔provider conversations are about patient care so HIPAA
// requires bodies to be encrypted at rest. We borrow the AES-256-GCM
// pattern from `marketplace/document-encryption.ts` but flatten it
// for short text payloads: one IV, one tag, one master key.
//
// Storage encoding (UTF-8 base64):
//   base64( iv (12B) || tag (16B) || ciphertext )
//
// The MESSAGE_ENCRYPTION_KEY env var is preferred; if absent we fall
// back to DOCUMENT_ENCRYPTION_KEY so dev environments don't need a
// second secret. Production must set a dedicated key per the
// HIPAA-Security minimum-necessary principle.

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm" as const;
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getMasterKey(): Buffer {
  const hex =
    process.env.MESSAGE_ENCRYPTION_KEY ?? process.env.DOCUMENT_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "MESSAGE_ENCRYPTION_KEY (or DOCUMENT_ENCRYPTION_KEY) env var is required " +
        "for provider-to-provider messaging",
    );
  }
  if (hex.length !== KEY_BYTES * 2) {
    throw new Error(
      `MESSAGE_ENCRYPTION_KEY must be ${KEY_BYTES * 2} hex chars (got ${hex.length})`,
    );
  }
  return Buffer.from(hex, "hex");
}

export function encryptMessageBody(plaintext: string): string {
  const key = getMasterKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptMessageBody(envelope: string): string {
  const blob = Buffer.from(envelope, "base64");
  if (blob.length < IV_BYTES + TAG_BYTES) {
    throw new Error("encrypted message body too short");
  }
  const key = getMasterKey();
  const iv = blob.subarray(0, IV_BYTES);
  const tag = blob.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ct = blob.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString(
    "utf8",
  );
}

/**
 * Decrypt with a graceful fallback for dev environments where the
 * encryption key may have been rotated, or rows pre-date the migration.
 * Returns a placeholder string instead of throwing — the UI can flag it.
 */
export function decryptMessageBodySafe(envelope: string): string {
  try {
    return decryptMessageBody(envelope);
  } catch {
    return "[encrypted message — decryption key unavailable]";
  }
}
