/**
 * Fitbit Activity Sync Integration (EMR-052)
 *
 * API client to synchronize patient biometric data from Fitbit.
 * Handles fetching Daily Activity, Sleep Logs, and Resting Heart Rate,
 * mapping them into the clinical OutcomeLog and ClinicalObservation tables.
 */

import { prisma } from "@/lib/db/prisma";

export interface FitbitSleepLog {
  logId: number;
  dateOfSleep: string;
  duration: number; // in milliseconds
  efficiency: number; // 0-100
  isMainSleep: boolean;
  levels: {
    summary: {
      deep?: { minutes: number };
      light?: { minutes: number };
      rem?: { minutes: number };
      wake?: { minutes: number };
    };
  };
}

export interface FitbitActivitySummary {
  steps: number;
  restingHeartRate?: number;
  veryActiveMinutes: number;
  fairlyActiveMinutes: number;
  lightlyActiveMinutes: number;
  sedentaryMinutes: number;
}

export interface FitbitDailyPayload {
  sleep: FitbitSleepLog[];
  summary: FitbitActivitySummary;
  date: string;
}

export class FitbitSyncClient {
  /**
   * Mock endpoint to simulate fetching data from Fitbit's Web API.
   * In production, this uses the user's OAuth access token.
   */
  async fetchDailyData(
    accessToken: string,
    date: string,
  ): Promise<FitbitDailyPayload> {
    console.log(
      `[FitbitSync] Fetching data for ${date} with token ${accessToken.slice(0, 4)}***`,
    );

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    return {
      date,
      sleep: [
        {
          logId: 12345,
          dateOfSleep: date,
          duration: 25200000, // 7 hours
          efficiency: 92,
          isMainSleep: true,
          levels: {
            summary: {
              deep: { minutes: 90 },
              light: { minutes: 210 },
              rem: { minutes: 90 },
              wake: { minutes: 30 },
            },
          },
        },
      ],
      summary: {
        steps: 8500,
        restingHeartRate: 62,
        veryActiveMinutes: 45,
        fairlyActiveMinutes: 20,
        lightlyActiveMinutes: 180,
        sedentaryMinutes: 600,
      },
    };
  }

  /**
   * Synchronizes a patient's Fitbit daily payload into Verdant's internal database.
   */
  async syncPatientData(
    patientId: string,
    accessToken: string,
    date: string,
  ): Promise<void> {
    const payload = await this.fetchDailyData(accessToken, date);

    const logsToCreate = [];
    const observationsToCreate = [];

    // 1. Process Sleep Log (efficiency translates to sleep quality)
    const mainSleep = payload.sleep.find((s) => s.isMainSleep);
    if (mainSleep) {
      logsToCreate.push({
        patientId,
        metric: "sleep" as const,
        value: mainSleep.efficiency / 10, // 92 -> 9.2
        note: `Fitbit Sleep Log (${(mainSleep.duration / 3600000).toFixed(1)} hrs, Efficiency: ${mainSleep.efficiency}%)`,
        loggedAt: new Date(payload.date),
      });
    }

    // 2. Process Activity and Resting HR
    // Resting HR is an observation
    if (payload.summary.restingHeartRate) {
      observationsToCreate.push({
        patientId,
        observedBy: "system:fitbit",
        observedByKind: "agent",
        category: "lifestyle_shift" as const,
        severity: "info" as const,
        summary: `Patient's resting heart rate was ${payload.summary.restingHeartRate} bpm.`,
        metadata: {
          rhr: payload.summary.restingHeartRate,
          steps: payload.summary.steps,
        },
        createdAt: new Date(payload.date),
      });
    }

    // Steps / Active minutes as energy metric (proxy)
    const activeMinutes =
      payload.summary.veryActiveMinutes + payload.summary.fairlyActiveMinutes;
    if (activeMinutes > 0) {
      // Normalize active minutes to a 0-10 scale (capped at 60 mins = 10)
      const energyScore = Math.min((activeMinutes / 60) * 10, 10);
      logsToCreate.push({
        patientId,
        metric: "energy" as const,
        value: Number(energyScore.toFixed(1)),
        note: `Fitbit Activity (${payload.summary.steps} steps, ${activeMinutes} active mins)`,
        loggedAt: new Date(payload.date),
      });
    }

    // 3. Batch DB insertions
    if (logsToCreate.length > 0) {
      await prisma.outcomeLog.createMany({ data: logsToCreate });
      console.log(`[FitbitSync] Inserted ${logsToCreate.length} OutcomeLogs`);
    }

    if (observationsToCreate.length > 0) {
      await prisma.clinicalObservation.createMany({
        data: observationsToCreate,
      });
      console.log(
        `[FitbitSync] Inserted ${observationsToCreate.length} ClinicalObservations`,
      );
    }
  }
}

export const fitbitClient = new FitbitSyncClient();
