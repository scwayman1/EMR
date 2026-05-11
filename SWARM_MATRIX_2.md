# Epic Swarm Matrix: Phase 2 (Tickets 31-63)

This document outlines the next 33 perfectly isolated agent tasks for Phase 2 of the Epic Swarm. 

**CRITICAL RULE OF THE SWARM:** No two agents are allowed to edit the same file. All tasks have been specifically chosen and scoped to target separate components, utilities, or isolated pages. This guarantees 0 merge conflicts when combining the 30 PRs.

## Swarm Dispatch Instructions

To execute this swarm:
1. Run the auto-orchestrator or create the branches manually.
2. For each task, open a new terminal/Claude session.
3. Checkout the branch: `git checkout <branch-name>`
4. Use Claude to build the component according to the ticket requirements.
5. Claude must run `npm run typecheck && npm run lint` before creating the PR.
6. Submit the PR and let the `auto-merge.sh` daemon squash it into main.

---

## The 33 Swarm Tasks

### Wave 6: Wearables & IoT Integrations (Pure TS API Clients)
*Building the foundation for continuous patient monitoring.*

| ID | Ticket | Branch | Target Files |
|---|---|---|---|
| 31 | EMR-050: Oura Ring Data Parser | `feat/swarm-31-oura` | `src/lib/integrations/oura-parser.ts` |
| 32 | EMR-051: Apple HealthKit Normalizer | `feat/swarm-32-healthkit` | `src/lib/integrations/healthkit-normalizer.ts` |
| 33 | EMR-052: Fitbit Activity Sync | `feat/swarm-33-fitbit` | `src/lib/integrations/fitbit-sync.ts` |
| 34 | EMR-053: Whoop Strain Score Mapper | `feat/swarm-34-whoop` | `src/lib/integrations/whoop-mapper.ts` |
| 35 | EMR-054: Garmin Vitals Ingestion | `feat/swarm-35-garmin` | `src/lib/integrations/garmin-ingestion.ts` |
| 36 | EMR-055: Dexcom CGM API Client | `feat/swarm-36-dexcom` | `src/lib/integrations/dexcom-api.ts` |
| 61 | EMR-080: FreeStyle Libre CGM Client | `feat/swarm-61-libre` | `src/lib/integrations/libre-api.ts` |
| 62 | EMR-081: Medtronic Guardian Parser | `feat/swarm-62-medtronic` | `src/lib/integrations/medtronic-parser.ts` |
| 63 | EMR-082: Eversense CGM Normalizer | `feat/swarm-63-eversense` | `src/lib/integrations/eversense-normalizer.ts` |

### Wave 7: Analytics & Reporting UI (Isolated Chart Components)
*Practice-level insights and demographic reporting components.*

| ID | Ticket | Branch | Target Files |
|---|---|---|---|
| 37 | EMR-056: Patient Retention Chart | `feat/swarm-37-retention` | `src/components/analytics/retention-chart.tsx` |
| 38 | EMR-057: Modality Efficacy Scatter | `feat/swarm-38-efficacy` | `src/components/analytics/efficacy-scatter.tsx` |
| 39 | EMR-058: Revenue by Provider Table | `feat/swarm-39-revenue` | `src/components/analytics/revenue-table.tsx` |
| 40 | EMR-059: Top Chemovars Leaderboard | `feat/swarm-40-chemovars` | `src/components/analytics/chemovar-leaderboard.tsx` |
| 41 | EMR-060: Demographics Pie Chart | `feat/swarm-41-demographics` | `src/components/analytics/demographics-chart.tsx` |
| 42 | EMR-061: No-Show Rate Trend Line | `feat/swarm-42-noshows` | `src/components/analytics/no-show-trend.tsx` |

### Wave 8: Patient Intake & Clinical Screeners (Isolated Forms)
*Standardized clinical assessments.*

| ID | Ticket | Branch | Target Files |
|---|---|---|---|
| 43 | EMR-062: Pain Quality Assessment | `feat/swarm-43-pain-form` | `src/components/intake/pain-quality-form.tsx` |
| 44 | EMR-063: Sleep Quality Index (PSQI) | `feat/swarm-44-psqi` | `src/components/intake/psqi-form.tsx` |
| 45 | EMR-064: Anxiety Screener (GAD-7) | `feat/swarm-45-gad7` | `src/components/intake/gad7-screener.tsx` |
| 46 | EMR-065: Depression Screener (PHQ-9) | `feat/swarm-46-phq9` | `src/components/intake/phq9-screener.tsx` |
| 47 | EMR-066: PTSD Screener (PCL-5) | `feat/swarm-47-pcl5` | `src/components/intake/pcl5-screener.tsx` |
| 48 | EMR-067: Cannabis Use Test (CUDIT) | `feat/swarm-48-cudit` | `src/components/intake/cudit-screener.tsx` |

### Wave 9: Clinical Documentation (SOAP Note UI Fragments)
*Building out the clinical charting workspace.*

| ID | Ticket | Branch | Target Files |
|---|---|---|---|
| 49 | EMR-068: Subjective: HPI Editor | `feat/swarm-49-hpi` | `src/components/clinical/soap/subjective-hpi.tsx` |
| 50 | EMR-069: Objective: Vitals Snapshot | `feat/swarm-50-vitals-snap` | `src/components/clinical/soap/objective-vitals.tsx` |
| 51 | EMR-070: Assessment: ICD-10 Search | `feat/swarm-51-icd10` | `src/components/clinical/soap/assessment-icd10.tsx` |
| 52 | EMR-071: Plan: E-Prescribe Button | `feat/swarm-52-eprescribe` | `src/components/clinical/soap/plan-eprescribe.tsx` |
| 53 | EMR-072: Follow-up Interval Picker | `feat/swarm-53-followup` | `src/components/clinical/soap/follow-up-selector.tsx` |
| 54 | EMR-073: Care Team Tagger Input | `feat/swarm-54-care-team` | `src/components/clinical/soap/care-team-tagger.tsx` |

### Wave 10: Advanced Scheduling & Telehealth
*Enhancing the provider and patient connect experience.*

| ID | Ticket | Branch | Target Files |
|---|---|---|---|
| 55 | EMR-074: Telehealth Waiting Room | `feat/swarm-55-waiting-room` | `src/components/telehealth/waiting-room.tsx` |
| 56 | EMR-075: Video Call Controls | `feat/swarm-56-call-controls` | `src/components/telehealth/call-controls.tsx` |
| 57 | EMR-076: Screen Share Button | `feat/swarm-57-screen-share` | `src/components/telehealth/screen-share-btn.tsx` |
| 58 | EMR-077: Appointment Waitlist Card | `feat/swarm-58-waitlist` | `src/components/scheduling/waitlist-card.tsx` |
| 59 | EMR-078: SMS Reminder Toggle | `feat/swarm-59-sms-toggle` | `src/components/scheduling/sms-reminder-toggle.tsx` |
| 60 | EMR-079: Provider Time-off Block | `feat/swarm-60-time-off` | `src/components/scheduling/time-off-block.tsx` |

---
*Note: As long as the swarm agents adhere strictly to their designated Target Files, Phase 2 will execute with zero merge conflicts, allowing us to roll out 33 new features seamlessly.*
