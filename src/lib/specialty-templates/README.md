# Specialty Templates

This directory is the **only** place you need to touch to add a new specialty
to LeafJourney. Drop a manifest file in `manifests/`, and the Practice
Onboarding Controller, the wizard's specialty selector, and every downstream
consumer pick it up automatically on next boot.

> **Architecture invariant.** LeafJourney is specialty-adaptive, not
> cannabis-first. The controller and modality layer never branch on
> `slug === "cannabis-medicine"`. Cannabis behaviour is a manifest
> configuration — the same way pain-management or behavioral-health behaviour
> is a manifest configuration. Adding a new specialty must be a file drop
> here. Zero changes anywhere else.

---

## How to add a specialty

1. **Create the manifest file.**
   Add a new file at `src/lib/specialty-templates/manifests/{slug}.ts` that
   exports a default object matching `SpecialtyManifest`
   (`src/lib/specialty-templates/manifest-schema.ts`).

   - The slug must be kebab-case and unique across all manifests.
   - `default_enabled_modalities` and `default_disabled_modalities` must
     reference modalities listed in `REGISTERED_MODALITIES` in
     `manifest-schema.ts`. The Zod schema rejects unknown modality strings.
   - If your specialty is non-cannabis, list `cannabis-medicine` in
     `default_disabled_modalities` (explicit disable, not absence). This is
     the v1 bleed gate.

2. **Validate locally.**
   Run `npm run manifests:lint`. The script imports every manifest file in
   `manifests/`, runs it through `validateManifest`, and exits non-zero on the
   first failure. CI runs the same script on every PR (see
   `.github/workflows/ci.yml`).

3. **Versioning (post-EMR-431 nested layout).**
   For new versions of an existing specialty, create
   `manifests/{slug}/v{X.Y.Z}.ts` instead of editing the flat file. The
   registry walks both flat (`{slug}.ts`) and nested (`{slug}/v*.ts`) layouts,
   so they coexist during the migration.

4. **That's it.**
   The wizard's specialty selector, the controller's `applyTemplateDefaults`,
   and every consumer of `listActiveSpecialtyTemplates()` pick up the new
   manifest the next time the server boots. No registry edit, no controller
   edit, no shell-renderer edit.

---

## Worked example: behavioral-health stub

> This example lives only in this README — do **not** ship it as a real
> manifest yet. It exists so you can see every required field in one place.

```ts
// src/lib/specialty-templates/manifests/behavioral-health.ts
import type { SpecialtyManifest } from "@/lib/specialty-templates/manifest-schema";

const behavioralHealth: SpecialtyManifest = {
  name: "Behavioral Health",
  slug: "behavioral-health",
  description:
    "Outpatient mental-health practice. Therapy-driven longitudinal care, " +
    "psychiatric medication management, validated rating scales (PHQ-9, " +
    "GAD-7), and crisis-resource workflows. Cannabis-medicine is disabled " +
    "by default; practices that want a cannabis arm opt in via a separate " +
    "specialty template.",
  icon: "brain",
  version: "1.0.0",
  default_care_model: "longitudinal-primary-care",
  default_workflows: [
    "intake-psychiatric",
    "therapy-session-note",
    "medication-management",
    "crisis-screening",
  ],
  default_modules: [
    "scheduling",
    "charting",
    "e-prescribing",
    "patient-portal",
    "billing",
    "telehealth",
  ],
  default_charting_templates: [
    "psychiatric-intake",
    "therapy-progress-note",
    "med-management-note",
  ],
  default_mission_control_cards: [
    "todays-schedule",
    "open-charts",
    "rating-scales-due",
    "messages-inbox",
    "refill-requests",
  ],
  default_patient_portal_cards: [
    "upcoming-appointments",
    "rating-scales",
    "medications",
    "messages",
    "billing",
  ],
  default_enabled_modalities: [
    "medications",
    "lifestyle",
    "patient-reported-outcomes",
    "referrals",
  ],
  // Explicit bleed-gate: cannabis-medicine is OFF by default for behavioral
  // health. A separate specialty (or an admin override) is required to
  // enable it for a specific practice.
  default_disabled_modalities: ["cannabis-medicine", "commerce-leafmart"],
  migration_mapping_defaults: {
    chief_complaint: "presenting_concern",
    psychiatric_history: "psych_history",
    current_medications: "medications",
    therapy_history: "therapy_history",
  },
};

export default behavioralHealth;
```

---

## Test-fixture escape hatch

The file `manifests/test-fixture-specialty.ts` exists for the registry test
suite (see `__tests__/extensibility.test.ts`). The loader skips any file
whose basename matches `/test-fixture-/` unless `NODE_ENV === "test"`, so
fixtures never pollute production specialty listings.

If you need an additional fixture, drop another `test-fixture-*.ts` file in
this directory — same naming convention, same auto-skip behaviour.

---

## File layout

```
src/lib/specialty-templates/
├── manifest-schema.ts        # Zod schema, REGISTERED_MODALITIES, validateManifest
├── registry.ts               # File-system discovery + sync loader (do not edit to add a specialty)
├── README.md                 # This file
├── manifests/
│   ├── cannabis-medicine.ts
│   ├── internal-medicine.ts
│   ├── pain-management-non-cannabis.ts
│   ├── test-fixture-specialty.ts        # NODE_ENV=test only
│   └── {slug}/                          # post-EMR-431 versioned layout
│       └── v{X.Y.Z}.ts
└── __tests__/
    ├── registry.test.ts
    └── extensibility.test.ts
```
