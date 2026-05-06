/**
 * Cannabis Medicine specialty manifest — EMR-408
 *
 * Certification-longitudinal care model. Enables the cannabis-medicine
 * modality and Leafmart commerce — practices opt into this specialty
 * deliberately. Procedures, imaging, and physical-therapy modalities are
 * disabled by default since they are out of scope for the certification
 * workflow.
 */

// TODO(EMR-429): integrate once the manifest-schema branch lands.
import type { SpecialtyManifest } from "@/lib/specialty-templates/manifest-schema";

const cannabisMedicine: SpecialtyManifest = {
  name: "Cannabis Medicine",
  slug: "cannabis-medicine",
  description:
    "Certification-and-followup cannabis practice. Initial certification " +
    "visit, dosing titration, and longitudinal outcome tracking with " +
    "per-product efficacy logs. Leafmart commerce is enabled so patients " +
    "can act on the clinician's recommendations.",
  icon: "leaf",
  version: "1.0.0",
  default_care_model: "certification-longitudinal",
  default_workflows: [
    "cannabis-certification",
    "dosing-titration",
    "outcome-followup",
  ],
  default_modules: [
    "scheduling",
    "charting",
    "e-prescribing",
    "patient-portal",
    "billing",
    "cannabis-recommendation",
    "leafmart-commerce",
    "outcome-tracking",
  ],
  default_charting_templates: ["cannabis-certification-note", "followup-note"],
  default_mission_control_cards: [
    "todays-schedule",
    "open-charts",
    "certifications-due",
    "outcome-checkins",
    "messages-inbox",
  ],
  default_patient_portal_cards: [
    "upcoming-appointments",
    "active-recommendations",
    "post-dose-checkins",
    "weekly-outcome-scales",
    "leafmart-orders",
    "messages",
  ],
  default_enabled_modalities: [
    "cannabis-medicine",
    "commerce-leafmart",
    "medications",
    "lifestyle",
    "patient-reported-outcomes",
  ],
  default_disabled_modalities: [
    "procedures",
    "imaging",
    "physical-therapy",
  ],
  migration_mapping_defaults: {
    qualifying_condition: "qualifying_conditions",
    prior_cannabis_use: "prior_cannabis_use",
    prior_outcomes: "prior_outcomes",
    current_medications: "medications",
    allergy_list: "allergies",
  },
};

export default cannabisMedicine;
