import { z } from "zod";

export const REGISTERED_MODALITIES = [
  "medications",
  "pain-medications",
  "labs",
  "imaging",
  "referrals",
  "procedures",
  "lifestyle",
  "physical-therapy",
  "functional-pain",
  "patient-reported-outcomes",
  "cannabis-medicine",
  "commerce-leafmart",
] as const;

export type RegisteredModality = (typeof REGISTERED_MODALITIES)[number];

export const REGISTERED_CARE_MODELS = [
  "longitudinal-primary-care",
  "longitudinal-interventional",
  "certification-longitudinal",
  "consultative",
  "procedural-only",
] as const;

export type RegisteredCareModel = (typeof REGISTERED_CARE_MODELS)[number];

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const modalityListSchema = z.array(z.string()).default([]);

export const SpecialtyManifestSchema = z
  .object({
    name: z.string().min(2).max(80),
    slug: z.string().regex(KEBAB_CASE, "slug must be kebab-case"),
    description: z.string(),
    icon: z.string().min(1),
    version: z.string().regex(SEMVER, "version must be semver"),
    /**
     * EMR-431 — Deprecation flag.
     *
     * When `true`, the manifest is excluded from `listActiveSpecialtyTemplates()`
     * and may NOT be used to seed a NEW PracticeConfiguration via
     * `applyTemplateDefaults` (the registry throws "DEPRECATED_TEMPLATE").
     *
     * Existing configurations that recorded `(slug, version)` against this
     * manifest continue to render — `getSpecialtyTemplate(slug, version)`
     * still returns the deprecated manifest by exact-version lookup so we
     * preserve immutability of published references.
     */
    deprecated: z.boolean().optional(),
    default_care_model: z.enum(REGISTERED_CARE_MODELS),
    default_workflows: z.array(z.string()).default([]),
    default_modules: z.array(z.string()).default([]),
    default_charting_templates: z.array(z.string()).default([]),
    default_mission_control_cards: z.array(z.string()).default([]),
    default_patient_portal_cards: z.array(z.string()).default([]),
    default_enabled_modalities: modalityListSchema,
    default_disabled_modalities: modalityListSchema,
    migration_mapping_defaults: z.record(z.unknown()).default({}),
  })
  .strict()
  .superRefine((manifest, ctx) => {
    const registered = new Set<string>(REGISTERED_MODALITIES);

    const checkSubset = (
      list: string[],
      field: "default_enabled_modalities" | "default_disabled_modalities",
    ) => {
      for (const m of list) {
        if (!registered.has(m)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `unknown modality "${m}" — must be one of REGISTERED_MODALITIES`,
          });
        }
      }
    };

    checkSubset(manifest.default_enabled_modalities, "default_enabled_modalities");
    checkSubset(manifest.default_disabled_modalities, "default_disabled_modalities");

    const enabled = new Set(manifest.default_enabled_modalities);
    for (const m of manifest.default_disabled_modalities) {
      if (enabled.has(m)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["default_disabled_modalities"],
          message: `modality "${m}" cannot be in both default_enabled_modalities and default_disabled_modalities`,
        });
      }
    }
  });

export type SpecialtyManifest = z.infer<typeof SpecialtyManifestSchema>;

export type ValidateManifestResult =
  | { ok: true; manifest: SpecialtyManifest }
  | { ok: false; errors: string[] };

export function validateManifest(raw: unknown): ValidateManifestResult {
  const result = SpecialtyManifestSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, manifest: result.data };
  }
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });
  return { ok: false, errors };
}
