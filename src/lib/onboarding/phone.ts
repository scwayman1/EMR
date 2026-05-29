// Phone-number normalization + formatting for the practice onboarding wizard.
//
// Kept as a pure, dependency-free module so the rules are unit-testable and
// shared by the client form. The companion server routes (/api/orgs,
// /api/practices) apply the same normalization before their Zod check.

/**
 * Reduce phone input to its significant digits. Tolerates spaces, dashes,
 * parens, dots, and a leading US country code ("+1" / "1") so pasted numbers
 * like "+1 (303) 555-1212" or "303.555.1212" normalize to "3035551212".
 *
 * Deliberately does NOT truncate to 10 digits: callers need to see overlong
 * input (extensions, non-US numbers, typos) so it can be rejected rather than
 * silently saved as a wrong-but-valid first-10-digits number.
 */
export function normalizePhoneDigits(value: string): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

/** Canonical "(555) 123-4567" string from the first 10 digits. */
export function toCanonicalPhone(digits: string): string {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/** True only when the input normalizes to exactly 10 significant digits. */
export function isValidPhone(value: string): boolean {
  return normalizePhoneDigits(value).length === 10;
}

/**
 * Live display formatter for a controlled phone input. Formats progressively
 * as the user types, and — critically — does NOT fabricate a valid-looking
 * number from overlong input. More than 10 significant digits renders as raw
 * digits so the field reads as invalid and validation rejects it.
 */
export function formatPhoneNumber(value: string): string {
  const digits = normalizePhoneDigits(value);
  const len = digits.length;
  if (len === 0) return "";
  if (len < 4) return digits;
  if (len < 7) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  if (len <= 10) {
    return toCanonicalPhone(digits);
  }
  return digits;
}
