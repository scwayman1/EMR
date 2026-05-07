/**
 * EMR-054: Psilocybin Therapy Specialty Manifest
 */
import type { SpecialtyManifest } from "../manifest-schema";

const manifest: SpecialtyManifest = {
  slug: "psilocybin-therapy",
  version: "1.0.0",
  name: "Psilocybin Therapy",
  description: "Guided psychedelic therapy protocols and integration tracking.",
  icon: "Sparkles",
  default_care_model: "psychedelic-assisted",
  default_enabled_modalities: ["psilocybin", "integration-therapy"],
  default_disabled_modalities: ["cannabis-medicine"],
  default_workflows: ["prep-session", "journey-session", "integration-session"],
  default_charting_templates: ["journey-log"],
  default_mission_control_cards: ["integration-metrics"],
  default_patient_portal_cards: ["preparation-guide"]
};

export default manifest;
