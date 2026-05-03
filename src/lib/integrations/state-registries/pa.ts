// Pennsylvania — PA DOH Medical Marijuana Program
// https://padohmmp.custhelp.com/
//
// Practitioners must register with PA DOH and complete the 4-hour course.
// Stub implementation falls back to a simulated submission when API
// credentials are not configured.

import {
  buildStubSuccess,
  postToRegistry,
  resolveRegistryEndpoint,
} from "./client";
import type { RegistrySubmission, RegistrySubmissionResult } from "./types";

const RENEWAL_DAYS = 365;

export async function submitPA(
  submission: RegistrySubmission,
): Promise<RegistrySubmissionResult> {
  const endpoint = resolveRegistryEndpoint("PA");
  if (!endpoint) return buildStubSuccess("PA", RENEWAL_DAYS);
  return postToRegistry(endpoint, "/v1/certifications", submission);
}
