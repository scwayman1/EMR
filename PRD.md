# Product Requirements Document — AI-Native Cannabis Care Platform

> This is the canonical PRD for the platform. It is the source of truth for product scope, vision, and build priorities. Architecture decisions live in `ARCHITECTURE.md`, agent specs in `AGENTS.md`, and build sequencing in `ROADMAP.md`.

## 1. Executive Summary

This product is a design-first, AI-native cannabis care platform that unifies patient acquisition, patient engagement, a lightweight but serious EMR core, clinical research access, secure communications, practice operations, longitudinal outcomes tracking, and an orchestration layer of specialized AI agents.

At a surface level, this product may appear to be an EMR with a patient portal. That framing is directionally useful, but incomplete. The deeper product thesis is that cannabis medicine, especially in specialty and oncology-adjacent use cases, lacks a modern operating system that can connect four things cleanly:

- patient acquisition and trust-building
- structured clinical workflow
- ongoing patient-reported outcomes and efficacy tracking
- research retrieval and clinical intelligence

Today, these functions are fragmented across websites, static resources, disconnected portals, manual messaging, and clinician memory. Valuable clinical insight is lost. Follow-up is inconsistent. Documentation becomes heavier than it should be. Research is available, but not operationalized inside the care workflow. Patients often encounter generic, stale, or low-trust software experiences.

This platform is designed to solve that.

The system creates one unified platform with role-based experiences for patients, clinicians, operators, and practice administrators. A premium, highly modern front-end runs on top of a serious, structured, compliance-aware clinical and operational backbone. An orchestration layer coordinates specialized AI agents that assist with intake, documentation, document organization, outcome follow-up, research synthesis, patient communication, practice launch, and administrative workflows.

The goal is not gimmicky automation. The goal is to reduce friction, improve continuity, and give physicians and operators leverage without sacrificing trust or clinical control.

## 2. Product Vision

Build the operating system for modern cannabis medicine.

The platform should:

- provide a beautiful, high-trust patient-facing experience
- give clinicians an elegant and extremely low-friction documentation and visit workflow
- centralize records, communication, and outcomes in one place
- make research more usable at the point of care
- create a continuous feedback loop around efficacy, symptoms, and patient response
- enable a medical practice to run on a leaner, smarter, more AI-assisted operational model
- serve as a long-term foundation for billing, coding, registry logic, and future reimbursement workflows

## 3. Product Principles

1. **Design must lead.** The benchmark is Linear, Notion, Superhuman, Hims — not legacy healthcare software.
2. **AI must reduce friction, not create it.** AI is mostly invisible; it should feel like relief.
3. **Physicians should practice medicine, not fight software.** Judgment belongs to the human.
4. **The patient must stay in the loop.** The portal is an active care companion, not dead storage.
5. **Research must become actionable.** Embedded in the workflow, not a separate library.
6. **The product must feel clinically legitimate.** Serious, trustworthy, quality-signaling.
7. **Structured data is strategic.** Capture it wherever it doesn't burden the workflow.
8. **One platform, multiple roles.** Role-based views, not a patchwork of portals.

## 4. Scope

Six product layers:

1. **Patient acquisition and entry layer** — acquisition sites + secure entry into the portal
2. **Patient portal** — profile, records, forms, outcomes, messaging, care plan
3. **Clinician workspace / EMR core** — chart, timeline, visit workspace, notes, research panel
4. **Practice management and workforce workflow layer** — onboarding, scheduling, ops dashboard
5. **AI orchestration layer** — event-driven workflow engine + approval gates + observability
6. **Initial agent fleet** — specialized workers for intake, documents, outcomes, scribing, research, etc.

## 5. Personas

- **New patient exploring cannabis care** — wants clarity, legitimacy, easy entry.
- **Ongoing therapeutic user** — wants continuity, renewals, secure messaging, symptom tracking.
- **Cannabis-focused clinician** — wants fast chart review, low-burden documentation, research at the point of care.
- **Practice operator** — wants intake visibility, message queue management, follow-up orchestration.
- **Research / medical intelligence user** — wants efficient retrieval of peer-reviewed cannabis evidence.

## 6. Data & Compliance Posture

- Structured first; narrative where clinically necessary.
- Full audit log on every sensitive read/write.
- Role-based access control, least privilege.
- HIPAA-aligned infrastructure (encryption in transit + at rest, signed URLs for PHI, no PHI in logs).
- Human in the loop for every finalized clinical artifact.
- Agents have explicit, enforced capability boundaries.

## 7. Success Criteria

- A patient can complete acquisition → account → intake → first visit prep in under 10 minutes of active time.
- A clinician can open a chart and understand the patient in under 60 seconds.
- Scribe Agent reduces note completion time by >40% while preserving clinician control.
- Mission Control surfaces every agent action with full traceability.
- The product visually outperforms legacy EMR software by an unambiguous margin.

---

*Full PRD content and build directives (multi-agent build prompt, initial fleet, architecture notes) originated in the project brief. This document captures the canonical scope; see `ARCHITECTURE.md`, `AGENTS.md`, `WORKFLOWS.md`, and `DESIGN_SYSTEM.md` for implementation detail.*
