/**
 * Dose Recommender Agent (EMR-004)
 * 
 * Clinical decision support tool that analyzes patient biometrics,
 * naive/experienced status, and therapeutic goals to suggest a 
 * starting cannabinoid regimen.
 */

export interface PatientProfile {
  weightKg: number;
  age: number;
  cannabisExperience: "Naive" | "Moderate" | "Experienced";
  primaryGoal: "Pain" | "Sleep" | "Anxiety" | "Neuropathy";
  currentMedications: string[];
}

export interface DoseRecommendation {
  startingDoseMg: number;
  ratioThcCbd: string;
  deliveryMethod: string;
  titrationDays: number;
  warnings: string[];
}

export class DoseRecommenderAgent {
  /**
   * Generates a clinical recommendation based on the "Start Low, Go Slow" methodology.
   */
  generateRecommendation(profile: PatientProfile): DoseRecommendation {
    const warnings: string[] = [];
    let startingDoseMg = 2.5; // Baseline microdose
    let ratioThcCbd = "1:1";
    let deliveryMethod = "Sublingual Tincture";
    let titrationDays = 3;

    // Adjust based on experience
    if (profile.cannabisExperience === "Experienced") {
      startingDoseMg = 10;
      titrationDays = 2;
    } else if (profile.cannabisExperience === "Moderate") {
      startingDoseMg = 5;
    } else {
      warnings.push("Patient is cannabis naive. Emphasize tracking of first dose effects.");
      if (profile.primaryGoal === "Anxiety") {
        ratioThcCbd = "1:20"; // High CBD to mitigate THC-induced anxiety
        startingDoseMg = 1; // Ultra microdose for THC
      }
    }

    // Adjust based on goal
    switch (profile.primaryGoal) {
      case "Sleep":
        if (profile.cannabisExperience !== "Naive") {
          ratioThcCbd = "1:1 THC:CBN";
        }
        deliveryMethod = "Capsule/Edible (Longer acting)";
        break;
      case "Pain":
        deliveryMethod = "Vaporizer (Acute) + Tincture (Maintenance)";
        break;
      case "Neuropathy":
        ratioThcCbd = "1:1";
        break;
    }

    // Drug-drug interaction flags (Simulated)
    const hasBloodThinners = profile.currentMedications.some(m => 
      m.toLowerCase().includes("warfarin") || m.toLowerCase().includes("eliquis")
    );
    
    if (hasBloodThinners) {
      warnings.push("CAUTION: CBD strongly inhibits CYP2C9/CYP3A4. Monitor INR closely if on warfarin.");
    }

    return {
      startingDoseMg,
      ratioThcCbd,
      deliveryMethod,
      titrationDays,
      warnings
    };
  }
}

export const doseRecommender = new DoseRecommenderAgent();
