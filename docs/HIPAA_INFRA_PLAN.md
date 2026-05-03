# The Ultimate EMR Infrastructure Plan
**Objective:** Achieve ironclad HIPAA compliance and a state-of-the-art deployment pipeline without unnecessarily inflating monthly cloud costs.
**Mode:** 2 (Plan Mode) - *Awaiting Approval*

---

## 1. Zero-Trust Network & Application Security (Cost: Free)
Currently, internal operator routes (`/ops`) are exposed to the public internet, relying solely on app-level authentication. 
- **The Plan:** We will implement an IP Allowlist via Next.js Edge Middleware for all `/(operator)` routes. Alternatively, we can route it through Cloudflare Zero Trust (Free Tier) to require a VPN/Identity check *before* the traffic even hits the Render servers.
- **Why it matters:** Hides your admin surfaces from automated scanners and botnets.

## 2. PHI Log Redaction (Cost: Free)
Currently, if the app throws an error containing a patient's name or email, it is written in plain text to Render's logging plane. Render is not acting as a BAA-signed entity for logging.
- **The Plan:** We will rip out standard `console.log` and install `pino`. We will configure aggressive redaction rules (e.g., masking `req.body.patient`, `email`, `ssn`) at the absolute lowest level.
- **Why it matters:** Ensures your infrastructure logs are "clean" and cannot constitute a HIPAA breach if accessed by unauthorized personnel.

## 3. Strict Vendor Compliance (Cost: Moderate - Clerk BAA)
HIPAA requires a Business Associate Agreement (BAA) with any vendor touching PHI.
- **The Auth Plan (Ticket EMR-387):** We will permanently remove the legacy auth fallback and fully integrate Clerk. Clerk offers a HIPAA-compliant tier with a BAA. 
- **The AI Plan:** We are currently routing dictation/AI traffic through OpenRouter, which does not sign BAAs. We will swap the `AGENT_MODEL_CLIENT` to connect directly to a BAA-eligible provider like Google Cloud Platform (GCP) Vertex AI or Anthropic Enterprise.

## 4. Disaster Recovery Drills (Cost: Free)
Render handles PostgreSQL backups, but compliance requires proof that backups *work*.
- **The Plan:** I will write a `scripts/disaster-recovery.sh` tool. Once a month, you run this script. It will automatically download the latest Render DB backup, spin it up in a local Docker container, run a verification test, and append a signed timestamp to a `COMPLIANCE_AUDIT.log` file in your repo.
- **Why it matters:** Provides instant, irrefutable evidence to auditors that you have a tested Disaster Recovery protocol.

## 5. The "Golden" Deployment Pipeline (Cost: Free)
Your CI currently checks types and builds. We will harden it.
- **The Plan:** We will add a staging pipeline using Render Preview Environments or a dedicated `staging` branch (like we prototyped earlier). We will also add a script to verify that all required environment variables are present *before* the build even starts, preventing production boot-loops.

---

## Execution Roadmap for Tonight
If you approve this plan, we will jump in and execute it in this exact order:

1. **Phase 1 (The Quick Wins):** Implement the `pino` log redaction and the Next.js Edge Middleware IP Allowlist for the `/ops` routes.
2. **Phase 2 (The Core Migration):** Tackle ticket `EMR-387` — fully lock down the app to Clerk authentication and delete the legacy fallback UI.
3. **Phase 3 (The Auditor Checklist):** Build the Disaster Recovery verification script and the formal deployment checklist.

*No expensive enterprise cloud tiers required. Just disciplined, policy-driven code.*
