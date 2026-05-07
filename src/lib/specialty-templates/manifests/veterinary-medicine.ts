/**
 * EMR-054: Veterinary Medicine Specialty Manifest
 */
import type { SpecialtyManifest } from "../manifest-schema";

const manifest: SpecialtyManifest = {
  slug: "veterinary-medicine",
  version: "1.0.0",
  name: "Veterinary Cannabis Care",
  description: "Canine and Feline endocannabinoid therapy protocols.",
  default_care_model: "animal-health",
  default_enabled_modalities: ["veterinary-medicine"],
  default_disabled_modalities: ["human-pharmacology"],
  default_workflows: ["vet-intake"],
  default_charting_templates: ["soap-vet"],
  default_mission_control_cards: ["pet-vitals", "weight-tracker"],
  default_patient_portal_cards: ["pet-profile"]
};

export default manifest;
