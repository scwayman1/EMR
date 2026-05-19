# Medicare Annual Security Assessment — FY 2026 (EMR-635)

**Instance of `medicare-annual-security-assessment.md`.** All fields are
prefilled with TODO placeholders for the compliance officer to complete.
Do not delete the TODO markers — replace them with evidence references
or "N/A — <reason>".

---

## 1. Scope & applicability — FY 2026

- **Fiscal year covered:** 2026 (calendar; [verify if org uses
  non-calendar FY]).
- **CMS programs in scope this year:** TODO (e.g., Medicare FFS billing,
  MIPS Promoting Interoperability, MSSP — confirm with billing lead).
- **Entities in scope:** Leafjourney clinic operations; Leafjourney EMR
  production + staging + DR; sub-processors per Appendix A.
- **Material changes since FY 2025 assessment:** TODO (list new
  sub-processors, new PHI surfaces, environment migrations, etc.).
- **CMS DUA active?** TODO yes / no. If yes, attach DUA reference and
  add CMS ARS controls to §4. [verify ARS catalog version applicable]

---

## 2. Administrative safeguards — §164.308 — FY 2026 status

| ID    | Control                                                | Status | Evidence reference (FY26) | Notes |
| ----- | ------------------------------------------------------ | ------ | ------------------------- | ----- |
| A-01  | Risk analysis                                          | TODO   | TODO — link SRA output    |       |
| A-02  | Risk management                                        | TODO   | TODO                      |       |
| A-03  | Sanction policy                                        | TODO   | TODO — link HR policy     |       |
| A-04  | Information system activity review                     | TODO   | `complianceAuditAgent` weekly digest exports |       |
| A-05  | Assigned Security Official                             | TODO   | TODO — name & appointment memo |   |
| A-06  | Workforce authorization & supervision                  | TODO   | TODO                      |       |
| A-07  | Workforce clearance                                    | TODO   | TODO — background-check log |     |
| A-08  | Workforce termination access revocation                | TODO   | TODO — Clerk + Okta deprovisioning log |  |
| A-09  | Information access management                          | TODO   | TODO                      |       |
| A-10  | Access authorization                                   | TODO   | TODO — RBAC matrix export |       |
| A-11  | Access establishment & modification                    | TODO   | TODO                      |       |
| A-12  | Security awareness & training                          | TODO   | TODO — FY26 training completion roster |  |
| A-13  | Security reminders                                     | TODO   | TODO — Slack #security-reminders archive |  |
| A-14  | Malicious software protection                          | TODO   | TODO — endpoint MDM report |      |
| A-15  | Log-in monitoring                                      | TODO   | Clerk failed-login dashboard; `complianceAuditAgent` auth-failure signal |  |
| A-16  | Password management                                    | TODO   | Clerk policy export       |       |
| A-17  | IRP documented                                         | TODO   | TODO — link IRP doc       |       |
| A-18  | IRP response & reporting                               | TODO   | TODO — FY26 tabletop minutes |    |
| A-19  | Contingency — data backup                              | TODO   | TODO — Postgres backup runbook |  |
| A-20  | Contingency — disaster recovery                        | TODO   | TODO                      |       |
| A-21  | Contingency — emergency mode                           | TODO   | TODO                      |       |
| A-22  | Contingency — testing & revision                       | TODO   | TODO — FY26 DR test report |      |
| A-23  | Applications & data criticality                        | TODO   | TODO                      |       |
| A-24  | Periodic evaluation                                    | In progress | This document        |       |
| A-25  | BAAs current                                           | TODO   | Appendix A                |       |

---

## 3. Physical safeguards — §164.310 — FY 2026 status

| ID    | Control                                                | Status | Evidence reference (FY26) | Notes |
| ----- | ------------------------------------------------------ | ------ | ------------------------- | ----- |
| P-01  | Facility contingency operations                        | TODO   | TODO                      |       |
| P-02  | Facility security plan                                 | TODO   | TODO                      |       |
| P-03  | Access control & validation                            | TODO   | TODO — badge-system log   |       |
| P-04  | Maintenance records                                    | TODO   | TODO                      |       |
| P-05  | Workstation use policy                                 | TODO   | TODO                      |       |
| P-06  | Workstation security                                   | TODO   | TODO — laptop-lock & MDM screen-lock policy |  |
| P-07  | Device & media disposal                                | TODO   | TODO — destruction certificates folder |  |
| P-08  | Media re-use sanitization                              | TODO   | TODO                      |       |
| P-09  | Hardware/media movement tracked                        | TODO   | TODO — asset inventory export |   |
| P-10  | Physical backup storage                                | TODO   | TODO — or N/A if cloud-only |     |

---

## 4. Technical safeguards — §164.312 — FY 2026 status

| ID    | Control                                                | Status      | Evidence reference (FY26) | Notes |
| ----- | ------------------------------------------------------ | ----------- | ------------------------- | ----- |
| T-01  | Unique user identification                             | Implemented | Clerk user IDs; no shared accounts |  |
| T-02  | Emergency access                                       | TODO        | TODO — break-glass procedure doc |  |
| T-03  | Automatic logoff                                       | TODO        | TODO — verify session TTL setting in Clerk |  |
| T-04  | Encryption at rest                                     | Implemented | `docs/compliance/encryption.md` §2; `src/lib/security/encryption-framework.ts` |  |
| T-05  | Audit controls                                         | Implemented | `AuditLog` model; `complianceAuditAgent`; `/ops/audit-trail` |  |
| T-06  | Integrity — authenticate ePHI                          | TODO        | HMAC-SHA-256 per encryption.md §2 — confirm scope coverage |  |
| T-07  | Authentication                                         | Implemented | Clerk-managed; MFA enforced — [verify MFA enforcement for all roles in FY26] |  |
| T-08  | Transmission integrity                                 | Implemented | TLS 1.2+ at load balancer |       |
| T-09  | Transmission encryption                                | Implemented | TLS 1.2+; HSTS — [verify HSTS preload status] |  |

---

## 5. Risk analysis — FY 2026

- **Methodology used:** NIST SP 800-30 Rev. 1 (per template §5.1).
- **HHS SRA Tool used?** TODO yes / no; if yes, attach export to
  Appendix B.
- **Interview participants:** TODO list (Security Official, Privacy
  Officer, Engineering lead, Clinic operations lead, IT/Helpdesk lead).
- **Date range of interviews:** TODO.

### 5.1 FY 2026 risk register

| Risk ID | Asset / process | Threat | Vulnerability | Likelihood | Impact | Inherent risk | Control(s) | Residual risk | Owner | Review date |
| ------- | --------------- | ------ | ------------- | ---------- | ------ | ------------- | ---------- | ------------- | ----- | ----------- |
| R-2026-001 | TODO         | TODO   | TODO          | TODO       | TODO   | TODO          | TODO       | TODO          | TODO  | TODO        |
| R-2026-002 | TODO         | TODO   | TODO          | TODO       | TODO   | TODO          | TODO       | TODO          | TODO  | TODO        |

---

## 6. Findings & remediation — FY 2026

| Finding ID | Source | Description | Severity | Control mapping | Owner | Target date | Status | Closed date | Verification |
| ---------- | ------ | ----------- | -------- | --------------- | ----- | ----------- | ------ | ----------- | ------------ |
| F-2026-001 | TODO   | TODO        | TODO     | TODO            | TODO  | TODO        | Open   |             |              |

---

## 7. Sign-off — FY 2026

| Field                                | Value                |
| ------------------------------------ | -------------------- |
| Fiscal year covered                  | FY 2026              |
| Assessment start date                | TODO                 |
| Assessment end date                  | TODO                 |
| Lead assessor                        | TODO                 |
| Assessor organization                | TODO (internal / firm name) |
| Security Official                    | TODO                 |
| Privacy Official                     | TODO                 |
| Executive sponsor                    | TODO                 |
| Date signed                          | TODO                 |
| Signature reference                  | TODO                 |
| **Next assessment due date**         | TODO — target: end of Q1 FY 2027 |
| Retention location                   | TODO — e.g., GDrive `Compliance/AnnualSRA/2026/` |

---

## Appendix A — FY 2026 sub-processor / BAA inventory

| Vendor | Service | PHI categories | BAA on file? | BAA last reviewed | Notes |
| ------ | ------- | -------------- | ------------ | ----------------- | ----- |
| Clerk  | Auth / identity | Account identifiers, emails | TODO | TODO | [verify BAA scope] |
| TODO — cloud host (AWS / GCP / etc.) | Compute, storage, DB | All ePHI fields | TODO | TODO | |
| TODO — email provider                | Transactional email  | Patient names, appt times | TODO | TODO | |
| TODO — observability (Sentry / etc.) | Error + perf telemetry | Scrubbed; verify no PHI | TODO | TODO | [verify PHI scrubbing] |
| TODO — additional vendors            | TODO                  | TODO                       | TODO | TODO | |

## Appendix B — FY 2026 evidence index

| Filename | SHA-256 | Description |
| -------- | ------- | ----------- |
| TODO     | TODO    | TODO        |
