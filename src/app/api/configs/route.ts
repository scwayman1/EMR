// EMR-435 — Configuration CRUD API
// POST /api/configs — create a draft PracticeConfiguration for
// { organizationId, practiceId }. Returns the new row.
//
// All endpoints under /api/configs (except by-practice/[practiceId]) require
// Implementation Admin. See ticket scope notes in branch description.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
// TODO(EMR-428): integrate `requireImplementationAdmin` + `logControllerAction`
// once src/lib/auth/super-admin.ts lands.
import {
  requireImplementationAdmin,
  logControllerAction,
} from "@/lib/auth/super-admin";
// TODO(EMR-408): integrate `applyTemplateDefaults` once
// src/lib/specialty-templates/registry.ts lands.
import { applyTemplateDefaults } from "@/lib/specialty-templates/registry";
import {
  readJson,
  invalidInput,
  withAuthErrors,
} from "./_helpers";

export const runtime = "nodejs";

const createDraftInput = z.object({
  organizationId: z.string().min(1),
  practiceId: z.string().min(1),
  // Optional specialty seed — when present we fan out template defaults via
  // EMR-408. NOT required at draft creation time; the wizard can pick a
  // specialty later (it's required at publish-time, validated by the publish
  // handler).
  selectedSpecialty: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  return (await withAuthErrors(async () => {
    const admin = await requireImplementationAdmin();

    const parsedBody = await readJson(req);
    if (!parsedBody.ok) return parsedBody.response;

    const parsed = createDraftInput.safeParse(parsedBody.body);
    if (!parsed.success) return invalidInput(parsed.error);

    const { organizationId, practiceId, selectedSpecialty } = parsed.data;

    // If a specialty was provided up front, seed the draft with the template
    // defaults from the EMR-408 registry. Otherwise we create an empty draft
    // and let the wizard fill it in later.
    const seed = selectedSpecialty
      ? await applyTemplateDefaults(selectedSpecialty)
      : {};

    // TODO(EMR-409): once `PracticeConfiguration` lands in prisma/schema.prisma
    // these field names are taken from the EMR-409 ticket spec
    // (status='draft', version=0, publishedAt/publishedBy null, settings JSON).
    const created = await prisma.practiceConfiguration.create({
      data: {
        organizationId,
        practiceId,
        status: "draft",
        version: 0,
        selectedSpecialty: selectedSpecialty ?? null,
        settings: seed,
        createdBy: admin.id,
      },
    });

    await logControllerAction({
      actorId: admin.id,
      action: "practice_config.draft_created",
      configurationId: created.id,
      organizationId,
      practiceId,
      metadata: { selectedSpecialty: selectedSpecialty ?? null },
    });

    return NextResponse.json(created, { status: 201 });
  })) as NextResponse;
}
