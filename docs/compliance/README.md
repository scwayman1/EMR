# Compliance documentation

This directory holds the auditor-facing compliance artifacts for
Leafjourney EMR. Each file is written so an external HIPAA, SOC 2, or
Medicare/CMS auditor can use it without having to read source code.

## Index

| Document | Purpose |
| -------- | ------- |
| [`encryption.md`](./encryption.md) | Algorithm-level documentation for §164.312 encryption controls — the auditable companion to `src/lib/security/encryption-framework.ts`. |
| [`medicare-annual-security-assessment.md`](./medicare-annual-security-assessment.md) | **Template** for the annual CMS / Medicare security assessment. Reusable; duplicated each fiscal year. |
| [`medicare-annual-security-assessment-2026.md`](./medicare-annual-security-assessment-2026.md) | **FY 2026 instance** of the annual assessment, prefilled with TODO placeholders for the compliance officer. |

## Annual Medicare security assessment cadence

Per 45 CFR §164.308(a)(8), HIPAA Covered Entities and Business Associates
must perform a **periodic evaluation** of security safeguards. For CMS /
Medicare programs (Medicare FFS, MIPS Promoting Interoperability, MSSP,
etc.), Leafjourney treats this as an **annual** obligation.

### Cycle at a glance

1. **One template, many instances.** `medicare-annual-security-assessment.md`
   is the durable template. Each fiscal year gets its own instance file
   named `medicare-annual-security-assessment-<YYYY>.md`, prefilled from
   the template, and progressively completed with evidence and sign-off.
2. **Target close:** end of Q1 of the *following* fiscal year (so the
   FY 2026 assessment is signed off by end of Q1 FY 2027).
3. **Out-of-band trigger:** the assessment (or the affected portions of
   it) must also be re-run when there is a material change to the EMR,
   a reportable security incident under §164.402, a change of Security
   or Privacy Official, or new CMS program participation.
4. **Retention:** assessment artifacts are retained for **six (6) years**
   per §164.316(b)(2)(i). Store the signed PDF and supporting evidence
   in the compliance records repository referenced in the sign-off block.

### Reminder workflow

The detailed T-90 / T-60 / T-30 / T-14 / T-0 reminder workflow lives in
§8 of the template. In summary:

- **T-90 days** — open a Linear ticket and duplicate the template into a
  new `medicare-annual-security-assessment-<YYYY>.md`.
- **T-60 days** — evidence collection sprint.
- **T-30 days** — risk analysis review meeting.
- **T-14 days** — draft findings circulated to Security Official and
  executive sponsor.
- **T-0** — sign-off, PDF render, artifact filed, next-year reminder
  scheduled.

A scheduled Claude Code routine MAY open the Linear reminder ticket
automatically; see the `schedule` skill.

## Conventions

- Use `[verify]` inline to flag any factual claim that needs human
  confirmation before sign-off (e.g., HSTS preload status, MFA
  enforcement scope, current CMS framework version).
- Link to source files by path (e.g.,
  `src/lib/security/encryption-framework.ts`) rather than pasting code,
  so the artifact stays accurate as the code evolves.
- Citations to regulation use the form `45 CFR §164.312(a)(2)(iv)`.
