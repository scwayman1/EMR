# Infrastructure Audit Report (V1)
**Date:** 2026-05-02
**Environment Evaluated:** Repository Configuration (`render.yaml`, `.env.example`, `.github/workflows`)
**Mode:** 1 (Audit Mode)

## Executive Summary
This report evaluates the current infrastructure-as-code (IaC) against the EMR Compliance Policy Checklist. The core deployment pipeline via Render Blueprints is highly disciplined (immutable deploys, schema migrations gated at boot), but there are critical gaps regarding PHI log redaction, network boundaries, and vendor compliance (BAA coverage).

---

## Findings by Severity

### 🔴 CRITICAL (Must Fix Before PHI Data Ingestion)
1. **Missing Log Redaction Configuration**
   - **Finding:** Neither `render.yaml` nor `.env.example` defines any configuration for masking PHI in stdout/stderr. Any unhandled exception could leak patient names, emails, or medical data directly into Render's logging plane.
   - **Remediation:** Introduce a `LOG_LEVEL` and `REDACT_PHI=true` environment variable, and implement a structured logger (like Pino) with redaction paths (e.g., `req.body.patientName`) enforced at the platform level.

2. **Vendor BAA Coverage (OpenRouter & OpenAI)**
   - **Finding:** `.env.example` lists OpenRouter and OpenAI Whisper as vendors. While Clerk and Supabase support HIPAA Business Associate Agreements (BAAs) on paid tiers, OpenRouter is an aggregator and OpenAI requires a specific enterprise agreement for BAA coverage. 
   - **Remediation:** Verify if OpenRouter has signed a BAA, or route PHI-touching LLM traffic directly to a HIPAA-eligible provider (e.g., Google Cloud Healthcare API or Anthropic Enterprise).

3. **Public Admin/Ops Endpoints**
   - **Finding:** The Next.js application serves `/(operator)/ops/*` and `/(clinician)/clinic/*` routes on the public internet. While authentication (Clerk) protects them, zero-trust security dictates that internal operator dashboards should have network-level protections.
   - **Remediation:** Implement IP allow-listing via Cloudflare/Vercel Edge middleware, or mandate a VPN for the `/ops` routes.

### 🟡 RECOMMENDED (Architectural Hygiene)
1. **Explicit Environment Separation**
   - **Finding:** Currently, `render.yaml` binds directly to `main` for production. Setting up staging requires manual dashboard intervention or duplicated YAML files. 
   - **Remediation:** Adopt a `render-staging.yaml` to formalize the staging environment in IaC.

2. **Worker Failure Alerts**
   - **Finding:** `emr-agent-worker` and `emr-scheduler` process critical background jobs (like clinical notes). If the scheduler crashes, there is no code-level definition mapping failure webhooks to an incident system like PagerDuty.
   - **Remediation:** Add a health-check monitor (like Sentry or BetterUptime) to the worker processes and expose a `/worker-health` endpoint.

3. **Backup Restoration Drills**
   - **Finding:** Render's `basic-256mb` Postgres plan includes daily backups, but there is no documented protocol for testing restoration.
   - **Remediation:** Add a `scripts/restore-test.sh` to the repository that pulls a backup and seeds a local DB to prove data recoverability.

### 🟢 OPTIONAL (Tech Debt)
1. **Secret Generation in CI**
   - **Finding:** `ci.yml` uses dummy secrets (`SESSION_SECRET: ci-placeholder-secret...`). This is perfectly fine for build verification, but moving forward, consider using a dedicated `.env.test` file to ensure the CI environment precisely mirrors local test environments.

---

## EMR Policy Checklist Status
- [ ] **Environment Separation:** Incomplete (No IaC staging definition).
- [x] **Secret Isolation:** Pass (`generateValue: true` prevents hardcoded production secrets).
- [ ] **Backups:** Partial (Enabled by vendor, but lacking restore drills).
- [x] **Storage Privacy:** Pass (`documents` bucket is documented as private).
- [ ] **Log Redaction:** Fail (No redaction layer).
- [ ] **Public Endpoints:** Fail (Ops routes exposed to public internet).
- [ ] **Worker Health:** Fail (No alerting).
- [ ] **Vendor Compliance:** Fail (OpenRouter/OpenAI BAA status unverified).
- [x] **Deploy Hygiene:** Pass (CI/CD and `render.yaml` boot scripts are excellent).

---
**Next Step:** Transition to **Mode 2 (Plan Mode)** to generate exact IaC patches for the Critical findings, pending human approval.
