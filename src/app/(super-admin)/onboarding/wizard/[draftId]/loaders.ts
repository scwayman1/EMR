// Server-side loaders for the wizard page. These wrap external concerns
// (auth gating + draft fetch) so the page component stays focused on
// rendering. As parallel tickets land we'll swap each shim for the real
// implementation:
//
//   - EMR-428: `requireImplementationAdmin` from `@/lib/auth/super-admin`
//   - EMR-409: the `PracticeConfiguration` Prisma model + Zod schema
//   - EMR-435: `/api/configs/[id]` GET (we keep direct prisma here for SSR)

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import type { PracticeConfiguration } from "@/lib/onboarding/wizard-types";

/**
 * TODO(EMR-428): replace with
 * `import { requireImplementationAdmin } from "@/lib/auth/super-admin";`
 *
 * Until that lands, this shim delegates to the existing session layer and
 * accepts any authenticated user with the `super_admin` role.  When EMR-428
 * lands its `requireImplementationAdmin` should subsume this check entirely.
 */
export async function requireImplementationAdminCompat() {
  const user = await requireUser();
  // The Role enum varies across environments — check by string match so this
  // shim doesn't break if the enum value is renamed before EMR-428 lands.
  const isAdmin = user.roles.some((r) =>
    ["super_admin", "implementation_admin"].includes(String(r)),
  );
  if (!isAdmin) throw new Error("FORBIDDEN");
  return user;
}

/**
 * TODO(EMR-409): replace with `prisma.practiceConfiguration.findUnique(...)`
 * once the model lands. For now we attempt a dynamic lookup and fall back to
 * a synthetic empty draft so the wizard chrome is renderable in dev.
 */
export async function loadDraftConfiguration(
  draftId: string,
): Promise<Partial<PracticeConfiguration> | null> {
  // Use a structural cast so this file compiles before EMR-409 adds the
  // model to Prisma. Once the model exists this becomes a normal call.
  const client = prisma as unknown as {
    practiceConfiguration?: {
      findUnique: (args: {
        where: { id: string };
      }) => Promise<Partial<PracticeConfiguration> | null>;
    };
  };

  if (client.practiceConfiguration?.findUnique) {
    return client.practiceConfiguration.findUnique({
      where: { id: draftId },
    });
  }

  // Fallback: synthesize a minimal draft so the shell renders during
  // pre-EMR-409 development. Real persistence kicks in once the model lands.
  return {
    id: draftId,
    organizationId: "",
  };
}
