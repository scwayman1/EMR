// Illinois — IDPH Medical Cannabis Patient Program
// https://dph.illinois.gov/topics-services/prevention-wellness/medical-cannabis.html
//
// Physician certifications are submitted through the IDPH portal. Stub
// implementation falls back to a simulated submission when API credentials
// are not configured.

import {
  buildStubSuccess,
  postToRegistry,
  resolveRegistryEndpoint,
} from "./client";
import type { RegistrySubmission, RegistrySubmissionResult } from "./types";

const RENEWAL_DAYS = 365;

export async function submitIL(
  submission: RegistrySubmission,
): Promise<RegistrySubmissionResult> {
  const endpoint = resolveRegistryEndpoint("IL");
  if (!endpoint) return buildStubSuccess("IL", RENEWAL_DAYS);
  return postToRegistry(endpoint, "/mcpp/certifications", submission);
}
