// EMR-241 — envelope encryption for vendor documents.
//
// Each document gets a freshly-generated 256-bit data encryption key
// (DEK). The DEK encrypts the document with AES-256-GCM. The DEK
// itself is then wrapped (encrypted) with the master key from
// DOCUMENT_ENCRYPTION_KEY env var, also AES-256-GCM. We persist the
// wrapped DEK alongside the ciphertext so a future master-key
// rotation only needs to rewrap N small DEKs, not re-encrypt every
// document.
//
// Storage encoding (single byte buffer):
//   [ DEK iv (12B) ][ DEK auth tag (16B) ][ wrapped DEK (32B) ]
//   [ payload iv (12B) ][ payload auth tag (16B) ][ ciphertext... ]
// = 88-byte fixed header + ciphertext bytes.
//
// AAD: the file SHA-256 of the *plaintext* is bound into the GCM auth
// tag so a swapped ciphertext fails decryption even if iv+tag look
// valid. The hash is also stored in DB for integrity at retrieval.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGO = "aes-256-gcm" as const;
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = (IV_BYTES + TAG_BYTES) * 2 + KEY_BYTES; // 88

export interface EncryptedDocument {
  /** Single buffer: header || ciphertext. Persist this verbatim. */
  blob: Buffer;
  /** SHA-256 of the *plaintext*. Persisted in DB for integrity check. */
  sha256Hex: string;
  /** Plaintext byte length, for content-length headers and audit logs. */
  plaintextBytes: number;
}

function getMasterKey(): Buffer {
  const hex = process.env.DOCUMENT_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "DOCUMENT_ENCRYPTION_KEY env var is required (32-byte hex string)",
    );
  }
  if (hex.length !== KEY_BYTES * 2) {
    throw new Error(
      `DOCUMENT_ENCRYPTION_KEY must be ${KEY_BYTES * 2} hex chars (got ${hex.length})`,
    );
  }
  return Buffer.from(hex, "hex");
}

export function encryptDocument(plaintext: Buffer): EncryptedDocument {
  const masterKey = getMasterKey();
  const dek = randomBytes(KEY_BYTES);
  const sha256Hex = createHash("sha256").update(plaintext).digest("hex");

  // Wrap the DEK under the master key. AAD = the SHA-256 of the
  // plaintext so swapping a wrapped DEK between documents fails.
  const dekIv = randomBytes(IV_BYTES);
  const dekCipher = createCipheriv(ALGO, masterKey, dekIv);
  dekCipher.setAAD(Buffer.from(sha256Hex, "hex"));
  const wrappedDek = Buffer.concat([dekCipher.update(dek), dekCipher.final()]);
  const dekTag = dekCipher.getAuthTag();

  // Encrypt the payload under the DEK. AAD = same hash for binding.
  const payloadIv = randomBytes(IV_BYTES);
  const payloadCipher = createCipheriv(ALGO, dek, payloadIv);
  payloadCipher.setAAD(Buffer.from(sha256Hex, "hex"));
  const ciphertext = Buffer.concat([
    payloadCipher.update(plaintext),
    payloadCipher.final(),
  ]);
  const payloadTag = payloadCipher.getAuthTag();

  const blob = Buffer.concat([
    dekIv,
    dekTag,
    wrappedDek,
    payloadIv,
    payloadTag,
    ciphertext,
  ]);

  return { blob, sha256Hex, plaintextBytes: plaintext.length };
}

export function decryptDocument(
  blob: Buffer,
  expectedSha256Hex: string,
): Buffer {
  if (blob.length < HEADER_BYTES) {
    throw new Error("encrypted blob too short to be a valid document");
  }
  const masterKey = getMasterKey();
  const aad = Buffer.from(expectedSha256Hex, "hex");

  let offset = 0;
  const dekIv = blob.subarray(offset, offset + IV_BYTES);
  offset += IV_BYTES;
  const dekTag = blob.subarray(offset, offset + TAG_BYTES);
  offset += TAG_BYTES;
  const wrappedDek = blob.subarray(offset, offset + KEY_BYTES);
  offset += KEY_BYTES;
  const payloadIv = blob.subarray(offset, offset + IV_BYTES);
  offset += IV_BYTES;
  const payloadTag = blob.subarray(offset, offset + TAG_BYTES);
  offset += TAG_BYTES;
  const ciphertext = blob.subarray(offset);

  // Unwrap DEK. setAuthTag must come before final().
  const dekDecipher = createDecipheriv(ALGO, masterKey, dekIv);
  dekDecipher.setAAD(aad);
  dekDecipher.setAuthTag(dekTag);
  const dek = Buffer.concat([
    dekDecipher.update(wrappedDek),
    dekDecipher.final(),
  ]);

  // Decrypt payload.
  const payloadDecipher = createDecipheriv(ALGO, dek, payloadIv);
  payloadDecipher.setAAD(aad);
  payloadDecipher.setAuthTag(payloadTag);
  const plaintext = Buffer.concat([
    payloadDecipher.update(ciphertext),
    payloadDecipher.final(),
  ]);

  // Final integrity check — defense in depth against a future bug
  // that lets through a tampered AAD.
  const actualHash = createHash("sha256").update(plaintext).digest("hex");
  if (actualHash !== expectedSha256Hex) {
    throw new Error("plaintext SHA-256 mismatch after decryption");
  }
  return plaintext;
}

// Helper for tests + setup scripts. Generates a 64-char hex string
// suitable for DOCUMENT_ENCRYPTION_KEY.
export function generateMasterKeyHex(): string {
  return randomBytes(KEY_BYTES).toString("hex");
}
