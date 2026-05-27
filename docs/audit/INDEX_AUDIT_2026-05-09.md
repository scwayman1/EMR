# Index audit — patient detail page hot paths

**Scope:** every `findMany`/`findFirst`/`count` invoked from
`src/app/(clinician)/clinic/patients/[id]/page.tsx` cross-referenced
against existing `@@index` declarations in `prisma/schema.prisma`.

**Method:**
1. Enumerate Prisma calls in the patient page and the `where` /
   `orderBy` shapes.
2. For each, compute the index that would cover the filter + sort.
3. Compare against existing indexes.
4. Recommend additions where coverage is missing OR where the
   query's sort column is not the trailing column of an otherwise-
   matching index.

This audit was static — `EXPLAIN ANALYZE` against a live database
will refine the priority order. The 5 indexes added in this migration
are conservative coverages of obvious gaps; further tuning is a
follow-up after the migration is in prod and pg_stat_statements has
data.

## Patient page query inventory

| # | Query | Where | Order | Coverage status |
|---|---|---|---|---|
| 1 | `note.findMany` | encounter.patientId + organizationId | createdAt desc | OK via Encounter indexes |
| 2 | `messageThread.findMany` | patientId | lastMessageAt desc | ✅ exact `(patientId, lastMessageAt)` |
| 3 | `assessmentResponse.findMany` | patientId | submittedAt desc | ✅ exact `(patientId, submittedAt)` |
| 4 | `dosingRegimen.findMany` | patientId | startDate desc | 🆕 add `(patientId, startDate)` |
| 5 | `doseLog.findMany` | patientId | loggedAt desc | ✅ exact `(patientId, loggedAt)` |
| 6 | `cannabisProduct.findMany` | organizationId, active | name asc | small set, OK |
| 7 | `patientMedication.findMany` | patientId, active | name asc | covered, name sort small |
| 8 | `patientMemory.findMany` | patientId, validUntil null | createdAt desc | OK via `(patientId, createdAt)` |
| 9 | `clinicalObservation.findMany` | patientId | createdAt desc | 🆕 add `(patientId, createdAt)` — existing indexes require category/severity predicate |
| 10 | `claim.findMany` | patientId | serviceDate desc | ✅ exact `(patientId, serviceDate)` |
| 11 | `claim.count` | patientId, status IN (...) | — | 🆕 add `(patientId, status)` — existing indexes don't lead with `(patientId, status)` |
| 12 | `task.findMany` | patientId, status='open' | dueAt asc | 🆕 add `(patientId, status, dueAt)` — existing indexes lead with org or assignee |
| 13 | `encounter.findMany` (recentCharted) | organizationId, charting timestamps not null | chartingCompletedAt desc | 🆕 add `(organizationId, chartingCompletedAt)` |

## Indexes added by the migration

```
ClinicalObservation_patientId_createdAt_idx          (patientId, createdAt)
Claim_patientId_status_idx                           (patientId, status)
Task_patientId_status_dueAt_idx                      (patientId, status, dueAt)
Encounter_organizationId_chartingCompletedAt_idx     (organizationId, chartingCompletedAt)
DosingRegimen_patientId_startDate_idx                (patientId, startDate)
```

All five use `CREATE INDEX CONCURRENTLY` so they don't take an
`ACCESS EXCLUSIVE` lock on their table — required for prod
deployment against live tenant data.

## What this audit did NOT cover

- Other clinician pages (clinic dashboard, billing surfaces, ops dashboards)
- Patient portal pages
- Agent fan-out queries
- Cron job queries
- Marketplace / Leafmart commerce queries

Each is a separate audit pass. EPIC 2.4 budgets 5 days for the full
sweep — this PR closes the highest-traffic surface (the chart tab
that every clinician opens dozens of times per day).

## Follow-up

After this migration deploys:
1. Enable `pg_stat_statements` if not already on
2. Take a baseline of the 5 affected query shapes' mean and p95
   latency
3. Land the migration
4. Compare 24h and 7d post-migration. Document the actual win in
   this file.
5. Repeat for the next page (clinic dashboard) using the same
   methodology.
