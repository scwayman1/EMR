/**
 * Pain Management (non-cannabis) specialty manifest — EMR-408
 *
 * P0 acceptance gate for Practice Onboarding Controller v1.
 *
 * "cannabis-medicine" MUST appear in default_disabled_modalities, not just be
 * absent from default_enabled_modalities. This is the explicit bleed gate
 * that prevents cannabis-specific UI / workflows from appearing in a
 * pain-management practice that has not opted in.
 */

// TODO(EMR-429): integrate once the manifest-schema branch lands.
import type { SpecialtyManifest } from "@/lib/specialty-templates/manifest-schema";

const painManagementNonCannabis: SpecialtyManifest = {
  name: "Pain Management",
  slug: "pain-management-non-cannabis",
  description:
    "Longitudinal interventional pain practice. Pain-specific medications, " +
    "interventional procedures, imaging-driven workup, physical-therapy " +
    "referrals, and functional-pain outcome tracking. Cannabis-medicine is " +
    "explicitly disabled at the modality gate — practices that want a " +
    "cannabis arm must opt in via a separate specialty template.",
  icon: "activity",
  version: "1.0.0",
  default_care_model: "longitudinal-interventional",
  default_workflows: [
    "new-pain-consult",
    "pain-followup",
    "procedure-note",
    "imaging-review",
    "medication-review",
  ],
  default_modules: [
    "scheduling",
    "charting",
    "imaging",
    "procedures",
    "e-prescribing-controlled",
    "referrals",
    "patient-portal",
    "billing",
    "pdmp-check",
  ],
  default_charting_templates: [
    "pain-consult",
    "pain-followup",
    "procedure-note",
  ],
  default_mission_control_cards: [
    "todays-schedule",
    "procedure-board",
    "open-charts",
    "imaging-pending-review",
    "controlled-substance-monitoring",
    "messages-inbox",
    "refill-requests",
  ],
  default_patient_portal_cards: [
    "upcoming-appointments",
    "pain-diary",
    "functional-goals",
    "medications",
    "messages",
    "billing",
  ],
  default_enabled_modalities: [
    "pain-medications",
    "procedures",
    "imaging",
    "referrals",
    "physical-therapy",
    "functional-pain",
    "patient-reported-outcomes",
  ],
  // P0: cannabis-medicine MUST be present here (explicit disable, not absence).
  default_disabled_modalities: ["cannabis-medicine", "commerce-leafmart"],
  migration_mapping_defaults: {
    pain_score: "pain_scores",
    pain_location: "pain_location",
    pain_quality: "pain_quality",
    pain_radiation: "pain_radiation",
    prior_procedures: "prior_procedures",
    imaging_history: "imaging_history",
    medication_history: "medication_history",
    functional_limitations: "functional_limitations",
    prior_treatment_response: "prior_treatment_response",
    pdmp_history: "pdmp_history",
  },
};

export default painManagementNonCannabis;
