/**
 * EMR-084 — Encryption + Compliance Framework
 *
 * Centralizes the cryptography primitives the rest of the EMR uses for
 * PHI at rest. Three goals:
 *
 *   1. Single source of truth for "what algorithm and key length do we use?"
 *      — so a HIPAA / SOC 2 audit can point to one file.
 *   2. Envelope-encryption pattern: every encrypted field uses a per-record
 *      data-encryption key (DEK), wrapped by a single key-encryption key
 *      (KEK) sourced from the environment / KMS.
 *   3. Forward-compatible header so future key rotations don't have to
 *      rewrite old ciphertexts in place.
 *
 * Algorithm choices (matched to NIST SP 800-175B + HHS HIPAA guidance):
 *   - Symmetric:      AES-256-GCM (authenticated, IND-CCA secure)
 *   - Hashing:        SHA-256 for digests, HMAC-SHA-256 for integrity tokens
 *   - Password hash:  scrypt (built-in to Node) — argon2 is preferred but
 *                     keeps install footprint zero-dep.
 *   - KDF:            HKDF-SHA-256 for deriving per-purpose keys
 *
 * Compliance controls referenced:
 *   - HIPAA §164.312(a)(2)(iv) — Encryption and decryption
 *   - HIPAA §164.312(e)(2)(ii) — Encryption (transmission)
 *   - HIPAA §164.312(b)        — Audit controls
 *   - HHS Breach Safe Harbor  — Encryption rendering PHI unusable
 *
 * The companion document is `docs/compliance/encryption.md`.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

// ---------------------------------------------------------------------------
// Constants — keep these tied to documented algorithm choices.
// ---------------------------------------------------------------------------

export const SYMMETRIC_ALGO = "aes-256-gcm" as const;
export const KEY_BYTES = 32; // 256-bit
export const IV_BYTES = 12; // GCM standard
export const TAG_BYTES = 16; // GCM auth tag
export const SCRYPT_N = 16384;
export const SCRYPT_R = 8;
export const SCRYPT_P = 1;
export const SCRYPT_KEYLEN = 64;
export const HKDF_HASH = "sha256" as const;
export const FRAMEWORK_VERSION = 1;

// ---------------------------------------------------------------------------
// Envelope ciphertext format
// ---------------------------------------------------------------------------
// `v1:<iv-b64>:<tag-b64>:<wrappedDek-b64>:<ct-b64>`
//
// Splitting on `:` keeps the format greppable + auditable. Every field is
// base64url so the whole envelope is URL-safe + email-safe.

export interface EncryptedEnvelope {
  version: 1;
  iv: string; // base64url
  tag: string; // base64url
  wrappedDek: string; // base64url
  ciphertext: string; // base64url
}

function b64uEncode(buf: Buffer): string {
  return buf.toString("base64url");
}
function b64uDecode(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

export function serializeEnvelope(env: EncryptedEnvelope): string {
  return [
    `v${env.version}`,
    env.iv,
    env.tag,
    env.wrappedDek,
    env.ciphertext,
  ].join(":");
}

export function parseEnvelope(s: string): EncryptedEnvelope {
  const parts = s.split(":");
  if (parts.length !== 5) {
    throw new Error("Invalid encrypted envelope: wrong segment count");
  }
  const [version, iv, tag, wrappedDek, ciphertext] = parts;
  if (version !== "v1") {
    throw new Error(`Unsupported envelope version "${version}"`);
  }
  return { version: 1, iv, tag, wrappedDek, ciphertext };
}

// ---------------------------------------------------------------------------
// Key resolution
// ---------------------------------------------------------------------------
// In production the KEK comes from the cloud KMS (AWS KMS / GCP KMS).
// In dev, fall back to `EMR_PHI_KEK` from the environment.
// Throwing here at startup is intentional — we never want to silently fall
// back to a default-unsafe key.

export interface KeyResolver {
  /** Returns the key-encryption key as a 32-byte Buffer. */
  getKek(): Promise<Buffer>;
}

export class EnvironmentKeyResolver implements KeyResolver {
  constructor(private readonly envVar: string = "EMR_PHI_KEK") {}
  async getKek(): Promise<Buffer> {
    const v = process.env[this.envVar];
    if (!v) {
      throw new Error(
        `EMR_PHI_KEK not set — refusing to encrypt PHI with a default key.`,
      );
    }
    const buf = b64uDecode(v);
    if (buf.length !== KEY_BYTES) {
      throw new Error(
        `EMR_PHI_KEK must be ${KEY_BYTES} bytes (base64url), got ${buf.length}.`,
      );
    }
    return buf;
  }
}

let _resolver: KeyResolver = new EnvironmentKeyResolver();
export function setKeyResolver(r: KeyResolver): void {
  _resolver = r;
}
export function getKeyResolver(): KeyResolver {
  return _resolver;
}

// ---------------------------------------------------------------------------
// Per-purpose key derivation
// ---------------------------------------------------------------------------
// HKDF-SHA-256 lets us derive distinct sub-keys for distinct surfaces
// (PHI fields vs message bodies vs research exports) from the same KEK,
// so a leaked sub-key only affects its own surface.

export function deriveSubKey(kek: Buffer, purpose: string): Buffer {
  return Buffer.from(
    hkdfSync(HKDF_HASH, kek, Buffer.alloc(0), purpose, KEY_BYTES),
  );
}

// ---------------------------------------------------------------------------
// Symmetric encrypt / decrypt
// ---------------------------------------------------------------------------

function aesEncrypt(
  key: Buffer,
  plaintext: Buffer,
  aad?: Buffer,
): { iv: Buffer; ciphertext: Buffer; tag: Buffer } {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(SYMMETRIC_ALGO, key, iv);
  if (aad) cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv, ciphertext, tag };
}

function aesDecrypt(
  key: Buffer,
  iv: Buffer,
  ciphertext: Buffer,
  tag: Buffer,
  aad?: Buffer,
): Buffer {
  const decipher = createDecipheriv(SYMMETRIC_ALGO, key, iv);
  decipher.setAuthTag(tag);
  if (aad) decipher.setAAD(aad);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ---------------------------------------------------------------------------
// Envelope API — what callers actually use.
// ---------------------------------------------------------------------------

export interface EncryptOptions {
  /** Logical purpose used in HKDF key derivation (e.g., "phi-field", "msg-body"). */
  purpose: string;
  /** Additional authenticated data — typically a stable record id. */
  aad?: string;
}

export async function encryptString(
  plaintext: string,
  opts: EncryptOptions,
): Promise<string> {
  const kek = await _resolver.getKek();
  const wrapKey = deriveSubKey(kek, `wrap:${opts.purpose}`);
  const dek = randomBytes(KEY_BYTES);
  const aad = opts.aad ? Buffer.from(opts.aad, "utf8") : undefined;

  const { iv, ciphertext, tag } = aesEncrypt(
    dek,
    Buffer.from(plaintext, "utf8"),
    aad,
  );
  // Wrap the DEK with the wrapKey using a separate IV+tag concatenated.
  const dekWrap = aesEncrypt(wrapKey, dek);
  const wrappedDek = Buffer.concat([dekWrap.iv, dekWrap.tag, dekWrap.ciphertext]);

  return serializeEnvelope({
    version: 1,
    iv: b64uEncode(iv),
    tag: b64uEncode(tag),
    wrappedDek: b64uEncode(wrappedDek),
    ciphertext: b64uEncode(ciphertext),
  });
}

export async function decryptString(
  envelope: string,
  opts: EncryptOptions,
): Promise<string> {
  const env = parseEnvelope(envelope);
  const kek = await _resolver.getKek();
  const wrapKey = deriveSubKey(kek, `wrap:${opts.purpose}`);

  const wrappedBuf = b64uDecode(env.wrappedDek);
  const wrapIv = wrappedBuf.subarray(0, IV_BYTES);
  const wrapTag = wrappedBuf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const wrapCt = wrappedBuf.subarray(IV_BYTES + TAG_BYTES);
  const dek = aesDecrypt(wrapKey, wrapIv, wrapCt, wrapTag);

  const aad = opts.aad ? Buffer.from(opts.aad, "utf8") : undefined;
  const pt = aesDecrypt(
    dek,
    b64uDecode(env.iv),
    b64uDecode(env.ciphertext),
    b64uDecode(env.tag),
    aad,
  );
  return pt.toString("utf8");
}

// ---------------------------------------------------------------------------
// Hashing + integrity primitives
// ---------------------------------------------------------------------------

/** Stable SHA-256 hex digest — for de-identification, not for passwords. */
export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

/** HMAC-SHA-256 used for tamper-evidence (audit-log row hashing). */
export function hmacSha256(key: Buffer, input: string | Buffer): Buffer {
  return createHmac("sha256", key).update(input).digest();
}

/** Constant-time compare to prevent timing-side-channel attacks. */
export function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Password storage — scrypt
// ---------------------------------------------------------------------------

export interface PasswordHash {
  algo: "scrypt";
  salt: string; // base64url
  hash: string; // base64url
  params: { n: number; r: number; p: number; keylen: number };
}

export function hashPassword(plaintext: string): PasswordHash {
  const salt = randomBytes(16);
  const hash = scryptSync(plaintext, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return {
    algo: "scrypt",
    salt: b64uEncode(salt),
    hash: b64uEncode(hash),
    params: { n: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, keylen: SCRYPT_KEYLEN },
  };
}

export function verifyPassword(plaintext: string, stored: PasswordHash): boolean {
  if (stored.algo !== "scrypt") return false;
  const salt = b64uDecode(stored.salt);
  const expected = b64uDecode(stored.hash);
  const computed = scryptSync(plaintext, salt, stored.params.keylen, {
    N: stored.params.n,
    r: stored.params.r,
    p: stored.params.p,
  });
  return safeEqual(computed, expected);
}

// ---------------------------------------------------------------------------
// De-identification: deterministic hash with a service-wide salt
// ---------------------------------------------------------------------------
// HIPAA Safe Harbor "de-identified" requires that no direct identifiers are
// present and that any pseudo-identifier is not reversible. Salting with a
// derived sub-key (not the raw email/MRN) and SHA-256 satisfies that.

export async function deidentify(value: string, purpose = "deidentify"): Promise<string> {
  const kek = await _resolver.getKek();
  const subkey = deriveSubKey(kek, purpose);
  return hmacSha256(subkey, value).toString("hex");
}

// ---------------------------------------------------------------------------
// Compliance framework metadata — exported so the docs page can render it.
// ---------------------------------------------------------------------------

export interface ComplianceControl {
  id: string;
  family: "HIPAA" | "SOC 2" | "HITRUST" | "NIST";
  citation: string;
  description: string;
  /** What in this codebase implements the control. */
  implementation: string;
}

export const COMPLIANCE_CONTROLS: ComplianceControl[] = [
  {
    id: "HIPAA-164.312(a)(2)(iv)",
    family: "HIPAA",
    citation: "45 CFR §164.312(a)(2)(iv)",
    description: "Encryption and decryption of ePHI at rest.",
    implementation:
      "AES-256-GCM via `encryptString`/`decryptString` with envelope per-record DEKs.",
  },
  {
    id: "HIPAA-164.312(e)(2)(ii)",
    family: "HIPAA",
    citation: "45 CFR §164.312(e)(2)(ii)",
    description: "Encryption of PHI in transit.",
    implementation: "TLS 1.2+ enforced at the platform load balancer.",
  },
  {
    id: "HIPAA-164.312(b)",
    family: "HIPAA",
    citation: "45 CFR §164.312(b)",
    description: "Audit controls — record + examine activity in PHI systems.",
    implementation:
      "AuditLog model + ComplianceAuditAgent (`src/lib/agents/compliance-audit-agent.ts`).",
  },
  {
    id: "HIPAA-Safe-Harbor",
    family: "HIPAA",
    citation: "HHS Breach Safe Harbor Guidance",
    description:
      "Encryption renders PHI unusable, unreadable, or indecipherable.",
    implementation:
      "AES-256-GCM with per-record DEKs wrapped by HKDF-derived KEK; meets NIST 800-111.",
  },
  {
    id: "SOC2-CC6.1",
    family: "SOC 2",
    citation: "Trust Services Criteria CC6.1",
    description: "Logical access controls protect against unauthorized access.",
    implementation:
      "RBAC (`src/lib/rbac/*`) + sensitive-record access wall (`mental-health-access.ts`).",
  },
  {
    id: "SOC2-CC7.2",
    family: "SOC 2",
    citation: "Trust Services Criteria CC7.2",
    description: "System monitoring detects anomalies and responds.",
    implementation:
      "ComplianceAuditAgent flags off-hours access, high-volume snooping, auth bursts.",
  },
  {
    id: "NIST-SP-800-175B",
    family: "NIST",
    citation: "NIST SP 800-175B Rev. 1",
    description: "Cryptographic algorithm guideline for federal applications.",
    implementation:
      "Algorithm catalogue tracked in `SYMMETRIC_ALGO`, `HKDF_HASH`, scrypt params.",
  },
];

export const FRAMEWORK_DOC_PATH = "docs/compliance/encryption.md";
