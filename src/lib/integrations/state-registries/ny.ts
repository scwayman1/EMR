// New York — NY Office of Cannabis Management (OCM) Medical Cannabis Program
// https://cannabis.ny.gov/medical-cannabis
//
// Practitioners must be registered with NY OCM. Stub implementation falls back
// to a simulated submission when API credentials are not configured.

import {
  buildStubSuccess,
  postToRegistry,
  resolveRegistryEndpoint,
} from "./client";
import type { RegistrySubmission, RegistrySubmissionResult } from "./types";

const RENEWAL_DAYS = 365;

export async function submitNY(
  submission: RegistrySubmission,
): Promise<RegistrySubmissionResult> {
  const endpoint = resolveRegistryEndpoint("NY");
  if (!endpoint) return buildStubSuccess("NY", RENEWAL_DAYS);
  return postToRegistry(endpoint, "/practitioner/certifications", submission);
}
