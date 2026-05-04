// EMR-296 — Clerk authentication strategy: passkey + biometric (FaceID
// / TouchID via WebAuthn) for daily access, weekly step-up MFA for
// continued access. This module documents the policy and exports the
// helpers the app uses to enforce it. The actual session-level toggles
// (passkey enable, MFA enrollment) live in the Clerk dashboard; this
// file is the source of truth for the *application-side* policy.
//
// Why it matters: cannabis EMR is regulated, and Dr. Patel asked for
// "passcode, FaceID, etc." plus a weekly two-factor step-up to keep
// us inside HIPAA compliance defaults. Patient PHI lives behind these
// gates.

/**
 * Maximum age, in milliseconds, of the most recent strong-factor
 * authentication before we require a step-up. One week.
 */
export const STEP_UP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Minimum age, in milliseconds, after which the passkey/biometric
 * factor is considered "stale enough" that we should re-prompt for the
 * device-bound factor (in addition to the weekly step-up). 24h.
 */
export const PASSKEY_REPROMPT_MS = 24 * 60 * 60 * 1000;

/** Surfaces that always require a step-up regardless of last MFA timestamp. */
export const STEP_UP_REQUIRED_PATHS = [
  "/portal/profile/security",
  "/portal/medications/order",
  "/clinic/patients", // any clinician viewing PHI
  "/ops/cfo",
  "/ops/audit",
] as const;

/** Strategies, in preferred order, that the sign-in form should surface. */
export const PREFERRED_FIRST_FACTORS = [
  "passkey",
  "password", // fallback when device has no passkey enrolled
  "email_code",
] as const;

/** Strategies the user can layer on as a second factor. */
export const PREFERRED_SECOND_FACTORS = [
  "totp",
  "phone_code",
  "backup_code",
] as const;

/**
 * Decides whether the current session needs a step-up MFA prompt.
 *
 * Caller pattern:
 *
 *   const session = await currentSession();
 *   if (needsStepUp(session.lastFactorVerificationAt, currentPath)) {
 *     redirect("/sign-in?step-up=1&return=" + encodeURIComponent(currentPath));
 *   }
 */
export function needsStepUp(
  lastStrongFactorAt: Date | string | null | undefined,
  path: string,
  now: Date = new Date()
): boolean {
  if (STEP_UP_REQUIRED_PATHS.some((p) => path.startsWith(p))) return true;
  if (!lastStrongFactorAt) return true;
  const ts =
    typeof lastStrongFactorAt === "string"
      ? new Date(lastStrongFactorAt)
      : lastStrongFactorAt;
  return now.getTime() - ts.getTime() > STEP_UP_INTERVAL_MS;
}

/**
 * Decides whether to re-prompt for the device-bound factor (passkey or
 * biometric). Lighter-weight than full step-up — we can surface this on
 * any return-to-portal hop after a 24h absence.
 */
export function needsPasskeyReprompt(
  lastDeviceFactorAt: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!lastDeviceFactorAt) return true;
  const ts =
    typeof lastDeviceFactorAt === "string"
      ? new Date(lastDeviceFactorAt)
      : lastDeviceFactorAt;
  return now.getTime() - ts.getTime() > PASSKEY_REPROMPT_MS;
}
