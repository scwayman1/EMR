// Server-side loaders for the wizard page. These wrap external concerns
// (auth gating + draft fetch) so the page component stays focused on
// rendering. As parallel tickets land we'll swap each shim for the real
// implementation:
//
//   - EMR-428: `requireImplementationAdmin` from `@/lib/auth/super-admin`
//   - EMR-409: the `PracticeConfiguration` Prisma model + Zod schema
//   - EMR-435: `/api/configs/[id]` GET (we keep direct prisma here for SSR)

import { prisma } from "@/lib/db/prisma";
import { requireImplementationAdmin } from "@/lib/auth/super-admin";
import type { PracticeConfiguration } from "@/lib/onboarding/wizard-types";

/**
 * Ensures the caller is a LeafJourney super_admin or implementation_admin.
 */
export async function requireImplementationAdminCompat() {
  return requireImplementationAdmin();
}

/**
 * Loads a PracticeConfiguration draft by ID.
 */
export async function loadDraftConfiguration(
  draftId: string,
): Promise<Partial<PracticeConfiguration> | null> {
  return prisma.practiceConfiguration.findUnique({
    where: { id: draftId },
  });
}

