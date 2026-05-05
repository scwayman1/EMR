import { prisma } from "@/lib/db/prisma";

export interface TreatmentPlanGenerationParams {
  patientId: string;
  providerId: string;
  organizationId: string;
  primarySymptom: string;
  recommendedProducts: string[]; // Product IDs
  durationWeeks: number;
}

/**
 * AI-assisted Treatment Plan Generator
 * 
 * Generates a structured Care Plan for a patient based on their primary symptoms
 * and recommended products.
 */
export async function generateTreatmentPlan(params: TreatmentPlanGenerationParams) {
  // In V2, this will call the Cortex LLM agent to draft the plan.
  // For V1, we use a deterministic templating system based on the primary symptom.

  let rationale = "";
  let goals = [];

  const symptomLower = params.primarySymptom.toLowerCase();

  if (symptomLower.includes("sleep") || symptomLower.includes("insomnia")) {
    rationale = "Cannabinoids (specifically THC and CBN) have been shown to reduce sleep latency and improve continuous sleep duration. The selected products target nighttime relaxation without morning grogginess.";
    goals = [
      "Achieve 7+ hours of uninterrupted sleep",
      "Reduce time to fall asleep to under 30 minutes",
      "Minimize morning grogginess"
    ];
  } else if (symptomLower.includes("pain") || symptomLower.includes("inflammation")) {
    rationale = "A balanced THC:CBD ratio leverages the entourage effect to modulate pain receptors while CBD provides systemic anti-inflammatory benefits.";
    goals = [
      "Reduce daily pain levels from baseline",
      "Improve mobility and joint function",
      "Decrease reliance on traditional NSAIDs or opioids"
    ];
  } else if (symptomLower.includes("anxiety") || symptomLower.includes("stress")) {
    rationale = "CBD-dominant formulations with specific terpenes (like Linalool and Limonene) provide anxiolytic effects without the biphasic anxiety triggers sometimes associated with high-THC products.";
    goals = [
      "Reduce acute anxiety episodes",
      "Improve baseline mood and stress resilience",
      "Maintain clear-headed focus during daytime hours"
    ];
  } else {
    rationale = `A customized cannabinoid regimen designed to address ${params.primarySymptom}.`;
    goals = [
      `Manage symptoms related to ${params.primarySymptom}`,
      "Improve overall quality of life",
      "Establish a consistent baseline dosage"
    ];
  }

  // Create the plan in the database
  const plan = await prisma.carePlan.create({
    data: {
      patientId: params.patientId,
      providerId: params.providerId,
      organizationId: params.organizationId,
      status: "draft",
      title: `Cannabinoid Therapy Plan: ${params.primarySymptom}`,
      clinicalRationale: rationale,
      goals: goals,
      expiresAt: new Date(Date.now() + params.durationWeeks * 7 * 24 * 60 * 60 * 1000),
    }
  });

  return plan;
}
