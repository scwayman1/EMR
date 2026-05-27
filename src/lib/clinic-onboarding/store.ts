import type { ClinicOnboardingSubmission } from "./types";

const SUBMISSIONS = new Map<string, ClinicOnboardingSubmission>();

export function recordSubmission(s: ClinicOnboardingSubmission): void {
  SUBMISSIONS.set(s.id, s);
}

export function listSubmissions(): ClinicOnboardingSubmission[] {
  return Array.from(SUBMISSIONS.values()).sort((a, b) =>
    b.submittedAt.localeCompare(a.submittedAt),
  );
}

export function getSubmission(id: string): ClinicOnboardingSubmission | undefined {
  return SUBMISSIONS.get(id);
}
