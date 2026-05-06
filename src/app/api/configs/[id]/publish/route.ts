// EMR-435 — Configuration CRUD API
// POST /api/configs/[id]/publish
//
// Validates required fields (`selectedSpecialty`, `careModel`, at least one
// enabled modality), snapshots the row into `PracticeConfigurationVersion`,
// increments `version`, flips `status` → 'published', sets publishedAt /
// publishedBy, and revalidates the by-practice cache tag.

import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireImplementationAdmin } from "@/lib/auth/super-admin";
import { logControllerAction } from "@/lib/auth/audit-stub";
import { withAuthErrors, notFound } from "../../_helpers";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

/**
 * Required fields for publish. Specialty-adaptive — we never special-case a
 * specific slug here. `enabledModalities` may be empty for some specialties
 * but the ticket requires at least one enabled modality at publish time.
 */
function findMissing(
  config: Record<string, unknown>,
): string[] {
  const missing: string[] = [];

  if (!config.selectedSpecialty) missing.push("selectedSpecialty");
  if (!config.careModel) missing.push("careModel");

  const settings = (config.settings ?? {}) as Record<string, unknown>;
  const enabled = (settings.enabledModalities ??
    (config as Record<string, unknown>).enabledModalities) as
    | unknown[]
    | undefined;

  if (!Array.isArray(enabled) || enabled.length === 0) {
    missing.push("enabledModalities");
  }

  return missing;
}

export async function POST(_req: Request, { params }: Ctx) {
  return (await withAuthErrors(async () => {
    const admin = await requireImplementationAdmin();

    const config = await prisma.practiceConfiguration.findUnique({
      where: { id: params.id },
    });
    if (!config) return notFound();

    const missing = findMissing(config as unknown as Record<string, unknown>);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: "conflict", missing },
        { status: 409 },
      );
    }

    const nextVersion = (config.version ?? 0) + 1;
    const publishedAt = new Date();

    // Snapshot + flip in a single transaction so we never end up with a
    // version row pointing at a config that didn't actually flip.
    const published = await prisma.$transaction(async (tx) => {
      // TODO(EMR-409): the snapshot table column names are taken from the
      // EMR-409 ticket spec — confirm once the migration lands.
      await tx.practiceConfigurationVersion.create({
        data: {
          configurationId: config.id,
          version: nextVersion,
          snapshot: config as unknown as object,
          publishedAt,
          publishedBy: admin.id,
        },
      });

      return tx.practiceConfiguration.update({
        where: { id: config.id },
        data: {
          status: "published",
          version: nextVersion,
          publishedAt,
          publishedBy: admin.id,
        },
      });
    });

    // Bust the unstable_cache entry served by /by-practice/[practiceId]
    revalidateTag(`practice-config:${published.practiceId}`);

    await logControllerAction({
      actor: admin,
      action: "controller.config.published",
      targetId: published.id,
      after: { version: nextVersion },
    });

    return NextResponse.json(published);
  })) as NextResponse;
}
