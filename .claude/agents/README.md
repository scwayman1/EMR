# Leafjourney EMR — Project Subagents

Drop subagent definitions here as `.md` files. Each file defines a specialized
agent Claude Code can delegate to via the `Agent` tool.

## Format

```md
---
name: agent-name
description: When to use this agent (make it specific — this is how Claude decides to invoke).
tools: Read, Grep, Glob, Edit, Bash
model: sonnet
---

System prompt for the agent. Speak in its voice. Tell it what it knows, how it
thinks, what it should refuse, and what output format to return.
```

## Planned agents (see MALLIK.md / AGENTS.md for fleet context)

- `mallik.md` — product manager / prioritizer. Reads TICKETS.md, ROADMAP.md,
  and codebase state. Opinionated output.
- `scribe-reviewer.md` — reviews clinical note drafts for structure + safety.
- `rcm-auditor.md` — audits billing pipeline changes against the 10-layer
  cognitive architecture in docs/rcm-fleet/.
- `chatcb-curator.md` — maintains ChatCB knowledge base, classifies new
  cannabinoid-condition pairs as positive/negative/neutral per MCL framework.
- `compliance-guard.md` — reviews state-compliance form changes against the
  8-state matrix before they merge.
- `design-sentinel.md` — enforces DESIGN_SYSTEM.md (Apple iOS aesthetic,
  emoji-first patterns, per Dr. Patel directive).

Don't create an agent until you have a clear job-to-be-done for it. Generic
"helper" agents dilute the fleet.
