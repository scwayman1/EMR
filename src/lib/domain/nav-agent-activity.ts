/**
 * Ambient agent activity indicators for the sidebar nav.
 *
 * The clinician + operator layouts call `getActiveAgentActivity` once per
 * render and decorate `NavItem.activity` so the rail can show a subtle pulsing
 * dot next to any section currently being worked on by an AI agent.
 *
 * Data source: the `AgentJob` table (Prisma). We look for rows where the
 * status is "running" and scope to the caller's organization.
 *
 * The mapping from an agent's name (stored as `agentName` on AgentJob) to a
 * nav href is a small static table — if we add a new agent that doesn't map
 * to a visible nav entry we skip it rather than crashing. Multiple running
 * jobs against the same href dedupe down to a single dot so a burst of
 * message-urgency-observer runs doesn't light the rail up like a Christmas
 * tree.
 *
 * Failures never block login: the try/catch mirrors the `safeCount` pattern
 * in the clinician layout.
 */
import { prisma } from "@/lib/db/prisma";

/**
 * One piece of ambient activity surfaced on a nav row.
 *   href     — must match the NavItem's href (not a prefix, exact match).
 *   agentKey — the agent's registry name (AgentJob.agentName), retained for
 *              debuggability / aria. Not rendered to the user.
 *   tone     — "active" is emerald (an AI is writing a draft); "info" is sky
 *              (a passive observer is scanning, nothing awaits you yet).
 */
export type NavAgentActivity = {
  href: string;
  agentKey: string;
  tone: "info" | "active";
};

/**
 * Static mapping from `AgentJob.agentName` → nav href + visual tone.
 *
 * Kept as a plain object (not exhaustive over AgentKind) so that adding a
 * new agent that has no nav surface is a no-op instead of a type error.
 * Unmapped agents are silently skipped in `getActiveAgentActivity`.
 */
const AGENT_TO_NAV: Record<string, { href: string; tone: "info" | "active" }> = {
  // Drafts messages for clinician sign-off — shows up on Approvals.
  "prescription-safety": { href: "/clinic/approvals", tone: "active" },
  // Classifies + routes new denials — lights up the Denials row.
  "denial-triage": { href: "/ops/denials", tone: "active" },
  // Scrubs outgoing claims before submission — the Scrub row.
  "clearinghouse-submission": { href: "/ops/scrub", tone: "active" },
  // Passive scan for patients drifting off their regimen — Command Center.
  "adherence-drift-detector": { href: "/clinic/command", tone: "info" },
  // Triages inbound patient messages for urgency — Inbox.
  "message-urgency-observer": { href: "/clinic/messages", tone: "info" },
  // Looks for missed follow-ups / care-gap visits — Command Center.
  "visit-discovery-whisperer": { href: "/clinic/command", tone: "info" },
};

/**
 * Query currently-running agent jobs for an org and fold them down to one
 * entry per nav href. Safe to call from server components / layouts.
 *
 * Returns [] on any failure (missing table, transient DB error, etc.) so the
 * nav never blocks the page.
 */
export async function getActiveAgentActivity(
  organizationId: string,
): Promise<NavAgentActivity[]> {
  if (!organizationId) return [];
  try {
    const jobs = await prisma.agentJob.findMany({
      where: {
        status: "running",
        organizationId,
      },
      select: { agentName: true },
      take: 50,
    });

    // Dedupe: first-hit wins per href. If two different agents both map to
    // the same href, the earlier entry in the query result keeps the tone —
    // this is deterministic enough for a decorative indicator.
    const seen = new Map<string, NavAgentActivity>();
    for (const job of jobs) {
      const mapping = AGENT_TO_NAV[job.agentName];
      if (!mapping) continue;
      if (seen.has(mapping.href)) continue;
      seen.set(mapping.href, {
        href: mapping.href,
        agentKey: job.agentName,
        tone: mapping.tone,
      });
    }
    return Array.from(seen.values());
  } catch (err) {
    console.error("[nav-agent-activity] query failed, returning []:", err);
    return [];
  }
}

/**
 * Build a lookup index so layouts can decorate NavItems in O(1). Pure helper
 * kept beside the loader so tests can exercise it without touching prisma.
 */
export function indexActivityByHref(
  activity: NavAgentActivity[],
): Record<string, NavAgentActivity> {
  const out: Record<string, NavAgentActivity> = {};
  for (const a of activity) {
    out[a.href] = a;
  }
  return out;
}
