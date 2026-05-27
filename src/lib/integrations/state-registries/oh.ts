// Ohio — Cannabis Therapeutic Recommendation (CTR) system
// https://www.medicalmarijuana.ohio.gov/
//
// Physicians must hold a CTR certificate from the Ohio State Medical Board.
// Stub implementation falls back to a simulated submission when API
// credentials are not configured.

import {
  buildStubSuccess,
  postToRegistry,
  resolveRegistryEndpoint,
} from "./client";
import type { RegistrySubmission, RegistrySubmissionResult } from "./types";

const RENEWAL_DAYS = 365;

export async function submitOH(
  submission: RegistrySubmission,
): Promise<RegistrySubmissionResult> {
  const endpoint = resolveRegistryEndpoint("OH");
  if (!endpoint) return buildStubSuccess("OH", RENEWAL_DAYS);
  return postToRegistry(endpoint, "/ctr/recommendations", submission);
}
