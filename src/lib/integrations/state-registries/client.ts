// Generic helpers shared across per-state registry stubs.
//
// Real state registry APIs are heterogeneous (REST/SOAP/portal-only) and
// most require provider onboarding before credentials are issued. Until
// each state's contract is implemented, these helpers produce a deterministic
// stub response so the EMR UI can be exercised end-to-end.

import type {
  RegistrySubmission,
  RegistrySubmissionResult,
} from "./types";

export interface RegistryEndpoint {
  url: string;
  apiKey: string;
}

/**
 * Resolve `STATE_REGISTRY_<CODE>_API_URL` and `STATE_REGISTRY_<CODE>_API_KEY`
 * from the environment. Returns null when either is missing — caller should
 * fall back to stub mode.
 */
export function resolveRegistryEndpoint(
  stateCode: string,
): RegistryEndpoint | null {
  const code = stateCode.toUpperCase();
  const url = process.env[`STATE_REGISTRY_${code}_API_URL`];
  const apiKey = process.env[`STATE_REGISTRY_${code}_API_KEY`];
  if (!url || !apiKey) return null;
  return { url, apiKey };
}

export function buildStubSuccess(
  stateCode: string,
  renewalPeriodDays: number,
): RegistrySubmissionResult {
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + renewalPeriodDays);
  return {
    success: true,
    confirmationNumber: `${stateCode.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
    registryPatientId: `REG-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    expirationDate: expDate.toISOString().slice(0, 10),
    submittedAt: new Date().toISOString(),
    channel: "stub",
  };
}

export function buildManualSuccess(stateCode: string): RegistrySubmissionResult {
  return {
    success: true,
    confirmationNumber: `${stateCode.toUpperCase()}-MANUAL-${Date.now().toString(36).toUpperCase()}`,
    submittedAt: new Date().toISOString(),
    channel: "manual",
  };
}

export function buildErrorResult(errors: string[]): RegistrySubmissionResult {
  return {
    success: false,
    errors,
    submittedAt: new Date().toISOString(),
    channel: "electronic",
  };
}

/**
 * Generic POST submitter for state registry APIs. Each state's stub can call
 * this with its specific path/body shape; in production the path is the only
 * thing that typically differs per state (auth is bearer-token API key).
 */
export async function postToRegistry(
  endpoint: RegistryEndpoint,
  path: string,
  submission: RegistrySubmission,
): Promise<RegistrySubmissionResult> {
  try {
    const res = await fetch(`${endpoint.url}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${endpoint.apiKey}`,
      },
      body: JSON.stringify({
        formData: submission.formData,
        providerCredentials: submission.providerCredentials,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const errBody = await res.text();
      return buildErrorResult([
        `Registry API error: ${res.status} - ${errBody.slice(0, 500)}`,
      ]);
    }

    const result = (await res.json()) as {
      confirmationNumber?: string;
      patientId?: string;
      expirationDate?: string;
    };

    return {
      success: true,
      confirmationNumber: result.confirmationNumber,
      registryPatientId: result.patientId,
      expirationDate: result.expirationDate,
      submittedAt: new Date().toISOString(),
      channel: "electronic",
    };
  } catch (err) {
    return buildErrorResult([
      `Network error: ${err instanceof Error ? err.message : "Unknown error"}`,
    ]);
  }
}
