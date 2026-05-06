// EMR-453 — Migration Profile create endpoint.
//
// POST /api/migration-profiles
//   body: { configurationId: string, categories?: MigrationCategorySlug[] }
//
// When `categories` is omitted, the seed is derived from the linked
// PracticeConfiguration's `selectedSpecialty` manifest via
// buildDefaultProfileFromManifest(). Greenfield practices (no specialty yet)
// get just the universal slug set with `enabled: true`.
//
// Auth: Implementation Admin only. Audited via logControllerAction.
//
// Architecture: this route does NOT branch on specialty. The Pain Management
// vs. Internal Medicine vs. Cannabis difference is encoded entirely in each
// manifest's migration_mapping_defaults — see EMR-408.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireImplementationAdmin } from "@/lib/auth/super-admin";
import { logControllerAction } from "@/lib/auth/audit-stub";
import { getSpecialtyTemplate } from "@/lib/specialty-templates/registry";
import {
  readJson,
  invalidInput,
  withAuthErrors,
} from "@/app/api/configs/_helpers";
import {
  buildDefaultProfileFromManifest,
  UNIVERSAL_CATEGORY_SLUGS,
  type MigrationCategory,
  type MigrationCategorySlug,
} from "@/lib/migration/profile-types";

export const runtime = "nodejs";

// Slug union mirrored as a Zod literal-tuple. Keep this in sync with
// MigrationCategorySlug — TS will fail typecheck if the literal list drifts
// from the union (see `satisfies` below).
const CATEGORY_SLUGS = [
  "demographics",
  "medications",
  "allergies",
  "problem-list",
  "notes",
  "imaging-refs",
  "procedures",
  "appointments",
  "documents",
  "patient-reported-outcomes",
  "pain-scores",
  "pain-location",
  "prior-procedures",
  "imaging-history",
  "medication-history",
  "functional-limitations",
  "prior-treatment-response",
] as const satisfies ReadonlyArray<MigrationCategorySlug>;

const categorySlugSchema = z.enum(CATEGORY_SLUGS);

const createProfileInput = z.object({
  configurationId: z.string().min(1),
  categories: z.array(categorySlugSchema).optional(),
});

function categoriesFromExplicitSlugs(
  slugs: ReadonlyArray<MigrationCategorySlug>,
): MigrationCategory[] {
  const seen = new Set<MigrationCategorySlug>();
  const out: MigrationCategory[] = [];
  for (const slug of slugs) {
    if (seen.has(slug)) continue;
    out.push({ slug, enabled: true });
    seen.add(slug);
  }
  return out;
}

function greenfieldCategories(): MigrationCategory[] {
  return UNIVERSAL_CATEGORY_SLUGS.map((slug) => ({ slug, enabled: true }));
}

export async function POST(req: Request) {
  return (await withAuthErrors(async () => {
    const admin = await requireImplementationAdmin();

    const parsedBody = await readJson(req);
    if (!parsedBody.ok) return parsedBody.response;

    const parsed = createProfileInput.safeParse(parsedBody.body);
    if (!parsed.success) return invalidInput(parsed.error);

    const { configurationId, categories: explicitCategories } = parsed.data;

    const config = await prisma.practiceConfiguration.findUnique({
      where: { id: configurationId },
      select: { id: true, selectedSpecialty: true },
    });
    if (!config) {
      return NextResponse.json(
        { error: "configuration_not_found" },
        { status: 404 },
      );
    }

    let categories: MigrationCategory[];
    if (explicitCategories && explicitCategories.length > 0) {
      categories = categoriesFromExplicitSlugs(explicitCategories);
    } else if (config.selectedSpecialty) {
      const manifest = getSpecialtyTemplate(config.selectedSpecialty);
      categories = manifest
        ? buildDefaultProfileFromManifest(manifest)
        : greenfieldCategories();
    } else {
      categories = greenfieldCategories();
    }

    const created = await prisma.migrationProfile.create({
      data: {
        configurationId,
        sourceType: null,
        // Cast to Prisma's JsonArray-compatible value — MigrationCategory[]
        // is a JSON-safe shape (no Date/undefined nesting).
        categories: categories as unknown as object[],
        status: "draft",
        createdBy: admin.id,
      },
    });

    // Link the new profile back onto the parent configuration so the
    // controller can resolve "the migration profile for this config" without
    // a reverse lookup. PracticeConfiguration.migrationProfileId is a plain
    // String? column (no FK by design — see EMR-409).
    await prisma.practiceConfiguration.update({
      where: { id: configurationId },
      data: { migrationProfileId: created.id },
    });

    await logControllerAction({
      actor: admin,
      action: "controller.migration_profile.created",
      targetId: created.id,
      after: {
        configurationId,
        categoryCount: categories.length,
        seededFrom: explicitCategories
          ? "explicit"
          : config.selectedSpecialty
            ? `manifest:${config.selectedSpecialty}`
            : "greenfield",
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        profile: created,
      },
      { status: 201 },
    );
  })) as NextResponse;
}
