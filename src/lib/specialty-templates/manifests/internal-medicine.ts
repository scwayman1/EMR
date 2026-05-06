/**
 * Internal Medicine specialty manifest — EMR-408
 *
 * Pure data. No logic. Registered automatically by the specialty-template
 * registry at module-init time. Adding a new specialty must be a new file
 * in this directory — never a controller change.
 */

// TODO(EMR-429): integrate once the manifest-schema branch lands.
import type { SpecialtyManifest } from "@/lib/specialty-templates/manifest-schema";

const internalMedicine: SpecialtyManifest = {
  name: "Internal Medicine",
  slug: "internal-medicine",
  description:
    "Longitudinal adult primary care: chronic disease management, annual " +
    "wellness, preventive screening, lab- and imaging-driven workups, and " +
    "specialist referrals. Cannabis-medicine and Leafmart commerce are off " +
    "by default.",
  icon: "stethoscope",
  version: "1.0.0",
  default_care_model: "longitudinal-primary-care",
  default_workflows: [
    "new-patient-intake",
    "annual-wellness",
    "chronic-condition-followup",
    "lab-review",
    "medication-reconciliation",
  ],
  default_modules: [
    "scheduling",
    "charting",
    "labs",
    "imaging",
    "e-prescribing",
    "referrals",
    "patient-portal",
    "billing",
  ],
  default_charting_templates: [
    "soap-note",
    "annual-wellness-note",
    "problem-focused-note",
  ],
  default_mission_control_cards: [
    "todays-schedule",
    "open-charts",
    "lab-results-pending-review",
    "imaging-pending-review",
    "messages-inbox",
    "refill-requests",
  ],
  default_patient_portal_cards: [
    "upcoming-appointments",
    "lab-results",
    "medications",
    "messages",
    "billing",
  ],
  default_enabled_modalities: [
    "medications",
    "labs",
    "imaging",
    "referrals",
    "lifestyle",
    "patient-reported-outcomes",
  ],
  default_disabled_modalities: [
    "cannabis-medicine",
    "commerce-leafmart",
    "procedures",
  ],
  migration_mapping_defaults: {
    problem_list: "problems",
    medication_list: "medications",
    allergy_list: "allergies",
    immunization_list: "immunizations",
    lab_results: "labs",
    imaging_results: "imaging",
    family_history: "family_history",
    social_history: "social_history",
    preventive_screenings: "preventive_screenings",
  },
};

export default internalMedicine;
