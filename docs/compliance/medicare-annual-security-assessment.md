# Medicare Annual Security Assessment — Template (EMR-635)

This is the **reusable template** for Leafjourney EMR's annual security
assessment of the controls required by CMS / Medicare programs that
process or transmit Protected Health Information (PHI). It is written for
a **compliance officer**, not an engineer — every section is meant to be
filled in, signed off on, and filed.

Each fiscal-year instance lives in a sibling document named
`medicare-annual-security-assessment-<FY>.md` (e.g.
`medicare-annual-security-assessment-2026.md`).

Companion documents:
- `encryption.md` — algorithm-level evidence for §164.312 controls.
- `README.md` — index, cadence, and reminder workflow.

---

## 1. Scope & applicability

### 1.1 Programs that trigger this assessment

Leafjourney EMR performs an annual security assessment when **any** of the
following are true:

- The organization participates in **Medicare Fee-for-Service** billing as
  a Covered Entity (CE) under HIPAA (45 CFR 160.103).
- The organization participates in the **Merit-based Incentive Payment
  System (MIPS)** — the *Promoting Interoperability* performance category
  requires an annual Security Risk Analysis (SRA) attestation.
  [verify — current MIPS measure ID with CMS QPP for the assessment year]
- The organization participates in the **Medicare Shared Savings Program
  (MSSP)** or an **ACO REACH** model that requires an annual security
  attestation. [verify per current participation agreement]
- The organization is a **Business Associate (BA)** to a Medicare CE and
  the BAA requires an annual security review.
- The organization handles CMS data subject to the **CMS Acceptable Risk
  Safeguards (ARS)** control catalog (e.g., research data via a CMS DUA).
  [verify — only required if a CMS DUA is active]

### 1.2 Entities covered

| Entity                          | In scope? | Notes                                       |
| ------------------------------- | --------- | ------------------------------------------- |
| Leafjourney clinic operations   | Yes       | All clinical workforce, all facilities      |
| Leafjourney EMR application     | Yes       | Production + staging + DR environments      |
| Sub-processors / vendors        | Yes       | Per BAA inventory; see Appendix A           |
| Marketing site (public pages)   | No        | No PHI; covered by general security review  |
| Research / de-identified data   | Partial   | Only if a CMS DUA or §164.514 path applies  |

### 1.3 Frameworks referenced

- **HIPAA Security Rule** — 45 CFR Part 164, Subpart C (§164.302–§164.318).
- **HIPAA Privacy Rule** — 45 CFR Part 164, Subpart E (only where it
  intersects with security controls, e.g., minimum necessary, access).
- **HIPAA Breach Notification Rule** — 45 CFR Part 164, Subpart D.
- **HHS OCR Security Risk Assessment (SRA) Tool** — used to structure the
  risk analysis methodology in §5 below.
- **NIST SP 800-66 Rev. 2** — Implementing the HIPAA Security Rule.
- **NIST SP 800-30 Rev. 1** — Risk assessment methodology.
- **CMS ARS 5.x** — only if a CMS DUA is in scope. [verify catalog version]

---

## 2. Administrative safeguards checklist — 45 CFR §164.308

| ID    | Control                                                | Citation               | Status | Evidence reference | Notes |
| ----- | ------------------------------------------------------ | ---------------------- | ------ | ------------------ | ----- |
| A-01  | Security Management Process — risk analysis            | §164.308(a)(1)(ii)(A) |        |                    |       |
| A-02  | Risk management — implement measures                   | §164.308(a)(1)(ii)(B) |        |                    |       |
| A-03  | Sanction policy for workforce non-compliance           | §164.308(a)(1)(ii)(C) |        |                    |       |
| A-04  | Information system activity review                     | §164.308(a)(1)(ii)(D) |        |                    |       |
| A-05  | Assigned Security Official (named individual)          | §164.308(a)(2)         |        |                    |       |
| A-06  | Workforce authorization & supervision                  | §164.308(a)(3)(ii)(A) |        |                    |       |
| A-07  | Workforce clearance procedure                          | §164.308(a)(3)(ii)(B) |        |                    |       |
| A-08  | Workforce termination procedures (access revocation)   | §164.308(a)(3)(ii)(C) |        |                    |       |
| A-09  | Information access management — isolating BA functions | §164.308(a)(4)(ii)(A) |        |                    |       |
| A-10  | Access authorization                                   | §164.308(a)(4)(ii)(B) |        |                    |       |
| A-11  | Access establishment and modification                  | §164.308(a)(4)(ii)(C) |        |                    |       |
| A-12  | Security awareness & training program                  | §164.308(a)(5)(i)      |        |                    |       |
| A-13  | Security reminders to workforce                        | §164.308(a)(5)(ii)(A) |        |                    |       |
| A-14  | Protection from malicious software                     | §164.308(a)(5)(ii)(B) |        |                    |       |
| A-15  | Log-in monitoring                                      | §164.308(a)(5)(ii)(C) |        |                    |       |
| A-16  | Password management                                    | §164.308(a)(5)(ii)(D) |        |                    |       |
| A-17  | Security Incident Response Plan (IRP) — documented     | §164.308(a)(6)(i)      |        |                    |       |
| A-18  | IRP — response & reporting procedures                  | §164.308(a)(6)(ii)     |        |                    |       |
| A-19  | Contingency plan — data backup                         | §164.308(a)(7)(ii)(A) |        |                    |       |
| A-20  | Contingency plan — disaster recovery                   | §164.308(a)(7)(ii)(B) |        |                    |       |
| A-21  | Contingency plan — emergency mode operation            | §164.308(a)(7)(ii)(C) |        |                    |       |
| A-22  | Contingency plan — testing & revision                  | §164.308(a)(7)(ii)(D) |        |                    |       |
| A-23  | Applications & data criticality analysis               | §164.308(a)(7)(ii)(E) |        |                    |       |
| A-24  | Periodic evaluation (this assessment itself)           | §164.308(a)(8)         |        |                    |       |
| A-25  | Business Associate Agreements — inventory current      | §164.308(b)(1)         |        |                    |       |

Status values: `Implemented` / `Partial` / `Gap` / `N/A`.

---

## 3. Physical safeguards checklist — 45 CFR §164.310

| ID    | Control                                                | Citation               | Status | Evidence reference | Notes |
| ----- | ------------------------------------------------------ | ---------------------- | ------ | ------------------ | ----- |
| P-01  | Facility access controls — contingency operations      | §164.310(a)(2)(i)      |        |                    |       |
| P-02  | Facility security plan                                 | §164.310(a)(2)(ii)     |        |                    |       |
| P-03  | Access control & validation procedures                 | §164.310(a)(2)(iii)    |        |                    |       |
| P-04  | Maintenance records (physical security repairs)        | §164.310(a)(2)(iv)     |        |                    |       |
| P-05  | Workstation use — documented acceptable use            | §164.310(b)            |        |                    |       |
| P-06  | Workstation security — physical safeguards on devices  | §164.310(c)            |        |                    |       |
| P-07  | Device & media disposal                                | §164.310(d)(2)(i)      |        |                    |       |
| P-08  | Media re-use sanitization                              | §164.310(d)(2)(ii)     |        |                    |       |
| P-09  | Accountability — movement of hardware/media tracked    | §164.310(d)(2)(iii)    |        |                    |       |
| P-10  | Data backup and storage (physical copies)              | §164.310(d)(2)(iv)     |        |                    |       |

---

## 4. Technical safeguards checklist — 45 CFR §164.312

| ID    | Control                                                | Citation               | Status | Evidence reference | Notes |
| ----- | ------------------------------------------------------ | ---------------------- | ------ | ------------------ | ----- |
| T-01  | Unique user identification                             | §164.312(a)(2)(i)      |        |                    |       |
| T-02  | Emergency access procedure                             | §164.312(a)(2)(ii)     |        |                    |       |
| T-03  | Automatic logoff                                       | §164.312(a)(2)(iii)    |        |                    |       |
| T-04  | Encryption & decryption at rest                        | §164.312(a)(2)(iv)     |        | `encryption.md` §2 |       |
| T-05  | Audit controls (logs of PHI access & changes)          | §164.312(b)            |        | `encryption.md` §5 |       |
| T-06  | Integrity — mechanism to authenticate ePHI             | §164.312(c)(2)         |        |                    |       |
| T-07  | Person or entity authentication                        | §164.312(d)            |        |                    |       |
| T-08  | Transmission security — integrity controls             | §164.312(e)(2)(i)      |        |                    |       |
| T-09  | Transmission security — encryption in transit          | §164.312(e)(2)(ii)     |        | `encryption.md` §7 |       |

### 4.1 Evidence pointers (Leafjourney-specific)

- **T-04 (encryption at rest):** `src/lib/security/encryption-framework.ts`,
  documented in `docs/compliance/encryption.md`.
- **T-05 (audit controls):** `AuditLog` Prisma model;
  `src/lib/agents/compliance-audit-agent.ts`; ops view at `/ops/audit-trail`.
- **T-07 (authentication):** Clerk-managed sessions; see `docs/CLERK_SETUP.md`.
- **T-09 (transmission security):** TLS 1.2+ enforced at platform load
  balancer; HSTS preload. [verify HSTS preload status for current host]

---

## 5. Risk analysis methodology

### 5.1 Methodology

Follow **NIST SP 800-30 Rev. 1** structure:

1. **Identify threats** — adversarial (external attacker, malicious
   insider), accidental (human error), structural (equipment failure),
   environmental (fire, flood, power).
2. **Identify vulnerabilities** — for each in-scope system, list known
   weaknesses (unpatched libraries, missing MFA, etc.).
3. **Determine likelihood** — Low / Moderate / High.
4. **Determine impact** — Low / Moderate / High, weighted by PHI volume
   and breach-notification cost.
5. **Determine risk** — likelihood × impact, expressed on a 3×3 matrix.
6. **Recommend controls** — map to §164.308–§164.312 or compensating
   technical control.
7. **Document residual risk** — after controls are applied, what risk
   remains and who accepts it.

The HHS **SRA Tool** (current release; [verify version for assessment
year]) MAY be used to drive the interview portion of this analysis. Its
output is attached as an appendix.

### 5.2 Risk register template

| Risk ID | Asset / process | Threat              | Vulnerability                | Likelihood | Impact | Inherent risk | Control(s) applied | Residual risk | Owner | Review date |
| ------- | --------------- | ------------------- | ---------------------------- | ---------- | ------ | ------------- | ------------------ | ------------- | ----- | ----------- |
| R-001   |                 |                     |                              |            |        |               |                    |               |       |             |
| R-002   |                 |                     |                              |            |        |               |                    |               |       |             |

---

## 6. Findings & remediation log

| Finding ID | Source (audit / SRA / incident) | Description | Severity | Control mapping (§164.x) | Remediation owner | Target date | Status | Closed date | Verification evidence |
| ---------- | ------------------------------- | ----------- | -------- | ------------------------ | ----------------- | ----------- | ------ | ----------- | --------------------- |
| F-001      |                                 |             |          |                          |                   |             |        |             |                       |
| F-002      |                                 |             |          |                          |                   |             |        |             |                       |

Severity scale: `Critical` (active PHI exposure), `High` (control absent
or broken), `Medium` (control partial), `Low` (documentation gap).

---

## 7. Sign-off block

This section is completed at the end of each annual cycle.

| Field                                | Value |
| ------------------------------------ | ----- |
| Fiscal year covered                  |       |
| Assessment start date                |       |
| Assessment end date                  |       |
| Lead assessor (name & role)          |       |
| Assessor organization (internal / external firm)  |       |
| Security Official (HIPAA §164.308(a)(2))          |       |
| Privacy Official                     |       |
| Executive sponsor / approver         |       |
| Date signed                          |       |
| Signature (wet or e-sign reference)  |       |
| **Next assessment due date**         |       |
| Retention location for this artifact |       |

Retention: artifact retained for **six (6) years** from the date of
creation or the date when it was last in effect, whichever is later
(45 CFR §164.316(b)(2)(i)).

---

## 8. Annual cadence & reminder workflow

### 8.1 Cadence

- **Frequency:** Once per fiscal year, completed by **end of Q1** of the
  following fiscal year (so FY26 assessment closes by end of Q1 FY27).
- **Out-of-band trigger:** Re-run portions of this assessment whenever
  any of the following occur (per §164.308(a)(8)):
  - Material change to the EMR (new PHI surface, new sub-processor, new
    authentication provider).
  - Reportable security incident under §164.402.
  - Change of Security Official or Privacy Official.
  - New CMS program participation that brings additional control
    obligations (e.g., joining MSSP).

### 8.2 Reminder workflow (recommended)

1. **T-90 days before due date** — Compliance officer opens a Linear
   ticket titled `Annual Security Assessment FY<YEAR>` in the `compliance`
   team, with this template duplicated and prefilled.
2. **T-60 days** — Evidence collection sprint: each safeguard owner
   uploads evidence (screenshots, exports, policy revisions).
3. **T-30 days** — Risk analysis review meeting; risk register updated.
4. **T-14 days** — Draft findings & remediation log circulated to
   Security Official and executive sponsor.
5. **T-0** — Sign-off block completed; PDF rendered; artifact filed in
   the compliance records repository; next year's reminder scheduled.

### 8.3 Automation hooks (optional)

- A scheduled Claude Code routine MAY open the Linear reminder ticket
  automatically (see `loop` / `schedule` skills).
- The `/ops/compliance` dashboard SHOULD surface "days until next
  assessment due" once the date is recorded in the sign-off block.

---

## Appendix A — Sub-processor / BAA inventory snapshot

| Vendor | Service | PHI categories | BAA on file? | BAA last reviewed | Notes |
| ------ | ------- | -------------- | ------------ | ----------------- | ----- |

## Appendix B — Attached evidence

List every supporting file (policies, screenshots, SRA Tool export,
penetration-test report, training completion roster) by filename and
SHA-256 so the artifact is tamper-evident.

| Filename | SHA-256 | Description |
| -------- | ------- | ----------- |
