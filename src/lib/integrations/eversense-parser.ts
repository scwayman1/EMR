/**
 * Eversense CGM Normalizer (EMR-082)
 *
 * API client to parse continuous glucose data from Senseonics' Eversense
 * implantable CGM systems. Maps interstitial glucose values into Verdant's
 * ClinicalObservation schema to track metabolic health continuously.
 */

import { prisma } from "@/lib/db/prisma";

export interface EversenseReading {
  id: string;
  measuredAt: string; // ISO 8601
  glucoseValue: number; // mg/dL
  trend:
    | "DoubleUp"
    | "SingleUp"
    | "FortyFiveUp"
    | "Flat"
    | "FortyFiveDown"
    | "SingleDown"
    | "DoubleDown"
    | "NotComputable";
}

export interface EversenseDailyPayload {
  date: string;
  readings: EversenseReading[];
  estimatedA1C?: number; // Unique to Eversense 6-month sensors
  timeInRangePercent: number; // 70-180 mg/dL target
}

export class EversenseNormalizerClient {
  /**
   * Mock endpoint simulating fetching data from Eversense DMS (Data Management System).
   */
  async fetchDmsData(
    patientId: string,
    accessToken: string,
    date: string,
  ): Promise<EversenseDailyPayload> {
    console.log(
      `[EversenseNormalizer] Fetching DMS data for patient ${patientId} on ${date}`,
    );

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    return {
      date,
      estimatedA1C: 6.2,
      timeInRangePercent: 88,
      readings: [
        {
          id: `eversense-${date}-1`,
          measuredAt: `${date}T10:00:00Z`,
          glucoseValue: 112,
          trend: "Flat",
        },
        {
          id: `eversense-${date}-2`,
          measuredAt: `${date}T14:30:00Z`,
          glucoseValue: 210, // Hyperglycemic
          trend: "DoubleUp",
        },
        {
          id: `eversense-${date}-3`,
          measuredAt: `${date}T18:00:00Z`,
          glucoseValue: 65, // Hypoglycemic
          trend: "DoubleDown",
        },
      ],
    };
  }

  /**
   * Syncs a patient's Eversense daily payload into the Verdant schema.
   */
  async syncPatientData(
    patientId: string,
    accessToken: string,
    date: string,
  ): Promise<void> {
    const payload = await this.fetchDmsData(patientId, accessToken, date);

    const observationsToCreate = [];

    // 1. Log the daily summary (Average and Time in Range)
    observationsToCreate.push({
      patientId,
      observedBy: "system:eversense-cgm",
      observedByKind: "agent",
      category: "engagement" as const, // Metabolic control engagement
      severity:
        payload.timeInRangePercent >= 70
          ? ("info" as const)
          : ("concern" as const),
      summary: `Eversense CGM Daily Summary: ${payload.timeInRangePercent}% in range${payload.estimatedA1C ? `, eA1C: ${payload.estimatedA1C}%` : ""}.`,
      metadata: {
        tir: payload.timeInRangePercent,
        eA1C: payload.estimatedA1C,
      },
      createdAt: new Date(payload.date),
    });

    // 2. Scan for critical outliers (Highs / Lows)
    for (const reading of payload.readings) {
      if (reading.glucoseValue > 180) {
        observationsToCreate.push({
          patientId,
          observedBy: "system:eversense-cgm",
          observedByKind: "agent",
          category: "side_effect" as const,
          severity: "concern" as const,
          summary: `Glucose Spike Detected (Eversense): ${reading.glucoseValue} mg/dL (${reading.trend})`,
          metadata: {
            readingId: reading.id,
            value: reading.glucoseValue,
            trend: reading.trend,
          },
          createdAt: new Date(reading.measuredAt),
        });
      }

      if (reading.glucoseValue < 70) {
        observationsToCreate.push({
          patientId,
          observedBy: "system:eversense-cgm",
          observedByKind: "agent",
          category: "side_effect" as const,
          severity: "urgent" as const, // Hypoglycemia is critical
          summary: `Hypoglycemic Event Detected (Eversense): ${reading.glucoseValue} mg/dL (${reading.trend})`,
          metadata: {
            readingId: reading.id,
            value: reading.glucoseValue,
            trend: reading.trend,
          },
          createdAt: new Date(reading.measuredAt),
        });
      }
    }

    // 3. Batch Insert
    if (observationsToCreate.length > 0) {
      await prisma.clinicalObservation.createMany({
        data: observationsToCreate,
      });
      console.log(
        `[EversenseNormalizer] Inserted ${observationsToCreate.length} ClinicalObservations`,
      );
    }
  }
}

export const eversenseNormalizer = new EversenseNormalizerClient();
