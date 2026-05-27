// Florida — Medical Marijuana Use Registry (MMUR)
// https://mmuregistry.flhealth.gov/
//
// Stub implementation: production wiring requires onboarding as a qualified
// physician with FDOH OMMU and obtaining MMUR API credentials. Until then,
// missing env vars short-circuit to a simulated successful submission.

import {
  buildStubSuccess,
  postToRegistry,
  resolveRegistryEndpoint,
} from "./client";
import type { RegistrySubmission, RegistrySubmissionResult } from "./types";

const RENEWAL_DAYS = 210;

export async function submitFL(
  submission: RegistrySubmission,
): Promise<RegistrySubmissionResult> {
  const endpoint = resolveRegistryEndpoint("FL");
  if (!endpoint) return buildStubSuccess("FL", RENEWAL_DAYS);
  return postToRegistry(endpoint, "/v1/certifications", submission);
}
