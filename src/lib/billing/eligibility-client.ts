/**
 * Insurance Eligibility Client (EMR-046)
 * 
 * Simulated EDI 270/271 transaction client for verifying patient insurance
 * eligibility, with special logic flagging services that are traditionally
 * non-covered (like medical cannabis consultations).
 */

import { resolvePayerRule } from "./payer-rules";

export interface EligibilityRequest {
  patientId: string;
  providerNpi: string;
  payerId: string;
  serviceCode: string; // e.g., 99213 for E&M
  diagnosisCodes?: string[];
}

export interface EligibilityResponse {
  isEligible: boolean;
  status: "ACTIVE" | "INACTIVE" | "PENDING" | "UNKNOWN";
  coverageDetails: {
    deductibleMet: number;
    deductibleTotal: number;
    copayAmount: number;
  };
  warnings: string[];
  flags: {
    cannabisDiagnosis: boolean;
    cannabisServiceCode: boolean;
    payerExcludesCannabis: boolean;
  };
}

export class EligibilityClient {
  /**
   * Mock endpoint for verifying eligibility.
   * Highlights the cannabis-specific cash-pay vs covered hybrid model.
   */
  async checkEligibility(request: EligibilityRequest): Promise<EligibilityResponse> {
    console.log(`[EligibilityClient] Sending EDI 270 request for Payer ID: ${request.payerId}`);
    
    // Simulate network latency for EDI clearinghouse
    await new Promise(resolve => setTimeout(resolve, 800));

    const isCannabisCode = ["S0339", "99429"].includes(request.serviceCode);
    const hasCannabisDx = (request.diagnosisCodes ?? []).some(
      (c) => c.startsWith("F12") || c.startsWith("Z71") || c === "Z79.891"
    );

    const payerRule = resolvePayerRule({ payerId: request.payerId });
    const warnings: string[] = [];
    
    if (isCannabisCode) {
      warnings.push("Service code flagged as non-covered under standard plan benefits. Patient is responsible for 100% of charges.");
    }
    
    if (hasCannabisDx) {
      if (payerRule.excludesCannabis) {
        warnings.push(`Warning: ${payerRule.displayName} excludes cannabis services.`);
      } else if (payerRule.requiresPriorAuthForCannabis) {
        warnings.push(`Prior authorization required for cannabis services with ${payerRule.displayName}.`);
      }
    }

    return {
      isEligible: true,
      status: "ACTIVE",
      coverageDetails: {
        deductibleMet: 1250,
        deductibleTotal: 5000,
        copayAmount: isCannabisCode ? 0 : 35, 
      },
      warnings,
      flags: {
        cannabisDiagnosis: hasCannabisDx,
        cannabisServiceCode: isCannabisCode,
        payerExcludesCannabis: payerRule.excludesCannabis
      }
    };
  }
}

export const eligibilityClient = new EligibilityClient();
