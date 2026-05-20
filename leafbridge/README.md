# LeafBridge

**FHIR-native infrastructure for safe clinical AI.**

LeafBridge is an open-source clinical data lakehouse plus AI orchestration
layer. It lets clinics, specialty practices, and care teams unify patient data,
govern access, and safely route that data into AI-powered clinical and
administrative workflows.

Legacy EHRs are systems of record. LeafBridge is the system of intelligence and
coordination — a modern HIE paired with a governed agent operating system.

LeafBridge is the open-source infrastructure project. **LeafJourney** is the
commercial application layer on top.

---

## Repository layout

```
leafbridge/
  apps/          admin-console, agent-workbench, mission-control-demo
  services/      ingestion-gateway, fhir-server-adapter, terminology-service,
                 mpi-service, consent-service, policy-gateway,
                 agent-orchestrator, rag-service, audit-service,
                 notification-router
  packages/      fhir-schemas, specialty-dsl, agent-sdk, workflow-sdk,
                 auth-sdk, ui-kit
  infra/         docker-compose, kubernetes, helm, terraform
  docs/          architecture, api, security, implementation-guides,
                 specialty-templates, adrs
  examples/      synthetic-patients, internal-medicine-demo,
                 pain-management-demo, diabetes-demo, fhir-resources
  tests/         conformance, integration, security, agent-evals
```

## Developer promise

> In 30 minutes, a developer can ingest a synthetic patient, normalize data to
> FHIR, query the patient record, run an AI summary agent, and see the full
> audit trail.

If we cannot deliver this, the adoption wedge is gone.

## Local quickstart (target — v0.1)

```bash
git clone https://github.com/leafjourney/leafbridge
cd leafbridge
docker compose -f infra/docker-compose/docker-compose.yml up -d
pnpm install
pnpm dev
pnpm tsx scripts/load-synthetic-patient.ts examples/synthetic-patients/patient-001.json
```

Local stack brings online: HAPI FHIR server, Postgres + pgvector, MinIO,
Keycloak, OPA, Temporal, Qdrant, Redpanda.

## Architecture (five layers)

1. **Ingestion & Interoperability** — FHIR R4, HL7v2, C-CDA, PDF, CSV adapters
2. **Clinical Lakehouse** — Bronze → Silver → Gold → Platinum → Vector → Audit
3. **Trust Layer** — MPI, consent + policy, agent identity, audit
4. **AI Orchestration Engine** — agent registry, RAG, policy gatekeeper,
   human-review queue, audit ledger
5. **Application & Execution** — Mission Control, Patient 360, Agent
   Workbench, specialty workflow shells

Detailed architecture lives in [`docs/architecture/`](docs/architecture/).

## MVP scope ("The Bridge" v0.1)

A patient record can be:

1. Ingested from an outside source (HL7v2 / FHIR Bundle / PDF)
2. Normalized into FHIR + stored in canonical + analytics + vector projections
3. MPI-resolved against existing identities with an audited merge decision
4. Retrieved by an AI agent under a consent-aware policy
5. Summarized with citations back to source FHIR resources
6. Routed to the Agent Workbench for human approval
7. Written back to the chart with full audit trail (prompt + tool calls +
   sources + reviewer)

Demo specialties: **Internal Medicine** and **Pain Management**.

## Open-source vs commercial

| Open-source (Apache 2.0) | Commercial (LeafJourney) |
| -- | -- |
| Ingestion adapters | Hosted LeafBridge Cloud |
| MPI core | Epic / Oracle Health / Athena / eCW connectors |
| Consent engine | Premium specialty packs |
| Policy gateway | Advanced RCM agents |
| Agent SDK | SOC 2 / HIPAA managed package |
| Specialty DSL | Managed terminology service |
| Reference dashboards | Enterprise support + implementation |
| Synthetic dataset | Agent marketplace |

## Documentation map

- [Architecture](docs/architecture/) — five-layer design, data model, lakehouse zones
- [Security](docs/security/) — threat model, identity, data classification,
  encryption, audit, incident response
- [Implementation guides](docs/implementation-guides/) — FHIR profiles,
  search-parameter matrix, US Core conformance
- [Specialty templates](docs/specialty-templates/) — how the Practice
  Configuration manifest extends to agents, routing rules, and write-back
  policy
- [ADRs](docs/adrs/) — architecture decision records

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). All contributions are governed by the
[Code of Conduct](CODE_OF_CONDUCT.md). Security disclosures: see
[SECURITY.md](SECURITY.md).

## License

Apache 2.0 — see [LICENSE](LICENSE).
