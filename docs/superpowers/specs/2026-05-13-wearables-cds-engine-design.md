# Wearables Sync & CDS Engine Design

## Overview
A unified background architecture to continuously ingest biometric data from connected wearables (Whoop, Garmin, Dexcom, etc.) and run it through a Clinical Decision Support (CDS) Rules Engine to proactively alert providers of clinically significant events.

## 1. The Sync Daemon (Data Liquidity)
**Purpose:** Fetch recent data from wearable APIs and normalize it into the database.
* **Trigger:** An external cron scheduler calling a secured Next.js API route (e.g., `/api/cron/sync-wearables`) hourly.
* **Flow:**
  1. Query DB for all patients with active wearable integration tokens.
  2. Iterate through each patient and device type.
  3. Call the respective client (e.g., `whoopClient.syncPatientData()`) to pull the last 24 hours of data.
  4. Write normalized data to `OutcomeLog` and `ClinicalObservation`.
* **Error Handling:** If an API call fails or a token is expired, the system writes to `AuditLog` (or logs a failed `AgentJob`) and continues to the next patient to ensure the queue doesn't stall.

## 2. The Clinical Decision Support (CDS) Engine
**Purpose:** Evaluate fresh data against clinical rules to detect concerning trends.
* **Component:** `src/lib/cds/engine.ts`
* **Flow:** 
  1. Once data is saved, the Sync Daemon triggers `evaluatePatientCDS(patientId)`.
  2. The engine retrieves the patient's recent `OutcomeLog` and `ClinicalObservation` records (last 24-48 hours).
  3. It runs a suite of pure functions ("Rules") against this data.
* **Example Rules:**
  * **Overtraining / Burnout Risk:** Whoop Strain > 16 AND Recovery < 40%.
  * **Sustained Sleep Debt:** Sleep `OutcomeLog` < 6 hours for 3 consecutive days.
  * **Hypoglycemia Risk:** Dexcom reading < 70 mg/dL.
* **Output:** If a rule evaluates to `true`, it returns a `CDSTrigger` object.

## 3. Provider Alert Routing (Inbox Integration)
**Purpose:** Route `CDSTrigger` events to the provider without causing alert fatigue.
* **Component:** `src/lib/cds/alerts.ts`
* **Flow:**
  1. Receives a `CDSTrigger` from the CDS Engine.
  2. Checks for deduplication: *Does an open Task already exist for this specific patient and this specific rule within the last 24 hours?*
  3. If no duplicate exists, it creates a `Task` assigned to the patient's care team.
* **Task Details:**
  * Priority maps to rule severity (e.g., Hypoglycemia = "Urgent").
  * Title and description explain the trigger context.
  * Includes a deep link to the patient's chart/biometrics tab.

## Testing Strategy
* **Rules Engine:** Since rules are pure functions, they will be comprehensively unit-tested using mock arrays of `OutcomeLog` and `ClinicalObservation` data to verify triggers fire accurately.
* **Alert Routing:** Unit tests to verify the 24-hour deduplication logic prevents duplicate Task creation.
