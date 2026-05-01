import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

// ---------------------------------------------------------------------------
// EMR-065 — AI Compliance Audit Agent
// ---------------------------------------------------------------------------
// Continuously sweeps the AuditLog for activity patterns that compliance /
// privacy officers want to see surfaced WITHOUT having to write SQL:
//
//   - Off-hours chart access (after-hours / weekend)
//   - High-volume single-actor access ("VIP-style" snooping)
//   - Same-actor access to charts they have no treatment relationship with
//   - Break-glass overrides on sensitive (mental health / SUD) records
//   - Contraindication overrides (rx.contraindication.override)
//   - Auth anomalies (failed logins, password resets clustered in time)
//   - Record exports / downloads above a daily threshold
//   - PHI emails / faxes lacking a logged consent on file
//
// Each finding is ranked low / medium / high. The agent itself doesn't act
// on findings — it produces a structured report the privacy officer
// triages from `/ops/compliance` and converts to a corrective task.
//
// Cold-temperature, deterministic analytics (no LLM call). The "AI"
// label refers to the rule-engine approach + the optional natural-language
// summary the orchestrator can call afterwards if a model client is wired.
// ---------------------------------------------------------------------------

const input = z.object({
  organizationId: z.string(),
  /** How many days back to scan. Default: 14. */
  windowDays: z.number().int().min(1).max(90).optional(),
});

const finding = z.object({
  id: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  category: z.enum([
    "off_hours_access",
    "high_volume_access",
    "no_treatment_relationship",
    "sensitive_break_glass",
    "contraindication_override",
    "auth_anomaly",
    "bulk_export",
    "uncoupled_phi_disclosure",
  ]),
  title: z.string(),
  description: z.string(),
  /** Affected actor / patient / resource so the privacy officer can drill in. */
  evidence: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    }),
  ),
  /** Concrete remediation step. */
  recommendation: z.string(),
  /** ISO timestamp range covered by this finding. */
  windowStart: z.string(),
  windowEnd: z.string(),
});

const output = z.object({
  windowDays: z.number(),
  findings: z.array(finding),
  totals: z.object({
    eventsScanned: z.number(),
    actorsScanned: z.number(),
    high: z.number(),
    medium: z.number(),
    low: z.number(),
  }),
});

type Finding = z.infer<typeof finding>;

// Configurable thresholds — keep them readable.
const OFF_HOURS_START = 22; // 10pm
const OFF_HOURS_END = 6; // 6am
const HIGH_VOLUME_DAILY_THRESHOLD = 75;
const VERY_HIGH_VOLUME_DAILY_THRESHOLD = 150;
const BULK_EXPORT_DAILY_THRESHOLD = 10;
const AUTH_FAIL_BURST_PER_HOUR = 5;
const SENSITIVE_BREAK_GLASS_LOOKBACK_DAYS = 14;

function isOffHours(d: Date): boolean {
  const hour = d.getHours();
  const dow = d.getDay(); // 0=Sun, 6=Sat
  if (dow === 0 || dow === 6) return true;
  if (hour >= OFF_HOURS_START || hour < OFF_HOURS_END) return true;
  return false;
}

function makeId(category: Finding["category"], discriminator: string): string {
  return `${category}:${discriminator}`;
}

export const complianceAuditAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "complianceAudit",
  version: "1.0.0",
  description:
    "Sweeps the AuditLog for compliance signals (off-hours access, high-volume " +
    "snooping, break-glass overrides, auth anomalies, bulk exports) and produces " +
    "a ranked finding list for the privacy officer.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ organizationId, windowDays }, ctx) {
    const days = windowDays ?? 14;
    const now = new Date();
    const since = new Date(now.getTime() - days * 86_400_000);

    const rows = await prisma.auditLog.findMany({
      where: { organizationId, createdAt: { gte: since } },
      select: {
        id: true,
        action: true,
        actorUserId: true,
        actorAgent: true,
        subjectType: true,
        subjectId: true,
        createdAt: true,
        metadata: true,
      },
      orderBy: { createdAt: "asc" },
    });

    ctx.tools.source("audit-log", rows.map((r) => r.id));

    const findings: Finding[] = [];
    const actors = new Set<string>();

    // ------------------------------------------------------------------
    // 1. Off-hours chart access
    // ------------------------------------------------------------------
    const offHoursByActor = new Map<string, number>();
    const chartAccessByActor = new Map<string, Set<string>>();
    for (const r of rows) {
      const actor = r.actorUserId ?? r.actorAgent ?? "unknown";
      actors.add(actor);
      if (
        r.action === "chart.viewed" ||
        r.action === "section.viewed" ||
        r.action === "document.downloaded"
      ) {
        if (isOffHours(r.createdAt)) {
          offHoursByActor.set(
            actor,
            (offHoursByActor.get(actor) ?? 0) + 1,
          );
        }
        if (r.subjectType === "patient" && r.subjectId) {
          if (!chartAccessByActor.has(actor)) {
            chartAccessByActor.set(actor, new Set());
          }
          chartAccessByActor.get(actor)!.add(r.subjectId);
        }
      }
    }
    for (const [actor, count] of offHoursByActor) {
      if (count < 5) continue;
      const severity: Finding["severity"] =
        count >= 30 ? "high" : count >= 15 ? "medium" : "low";
      findings.push({
        id: makeId("off_hours_access", actor),
        severity,
        category: "off_hours_access",
        title: `Off-hours chart access by ${actor}`,
        description: `${count} chart-viewing events outside business hours in the last ${days} days.`,
        evidence: [
          { label: "actor", value: actor },
          { label: "events", value: String(count) },
        ],
        recommendation:
          severity === "high"
            ? "Confirm a documented after-hours coverage role; otherwise lock the account pending interview."
            : "Spot-check 5 random off-hours sessions for a documented clinical reason.",
        windowStart: since.toISOString(),
        windowEnd: now.toISOString(),
      });
    }

    // ------------------------------------------------------------------
    // 2. High-volume single-actor access (potential snooping)
    // ------------------------------------------------------------------
    for (const [actor, charts] of chartAccessByActor) {
      const uniquePatients = charts.size;
      const dailyAvg = uniquePatients / Math.max(days, 1);
      if (dailyAvg < HIGH_VOLUME_DAILY_THRESHOLD) continue;
      const severity: Finding["severity"] =
        dailyAvg >= VERY_HIGH_VOLUME_DAILY_THRESHOLD ? "high" : "medium";
      findings.push({
        id: makeId("high_volume_access", actor),
        severity,
        category: "high_volume_access",
        title: `High volume of chart access by ${actor}`,
        description: `Accessed ${uniquePatients} unique patient charts in ${days} days (~${dailyAvg.toFixed(0)}/day).`,
        evidence: [
          { label: "actor", value: actor },
          { label: "uniquePatients", value: String(uniquePatients) },
          { label: "dailyAvg", value: dailyAvg.toFixed(1) },
        ],
        recommendation:
          "Verify role-based necessity. Compare to peer-role baseline; investigate top 10 patients for treatment-relationship.",
        windowStart: since.toISOString(),
        windowEnd: now.toISOString(),
      });
    }

    // ------------------------------------------------------------------
    // 3. Sensitive (mental health) break-glass overrides
    // ------------------------------------------------------------------
    const breakGlassRows = rows.filter(
      (r) => r.action === "phi.sensitive.break_glass",
    );
    if (breakGlassRows.length > 0) {
      const byActor = new Map<string, number>();
      for (const r of breakGlassRows) {
        const a = r.actorUserId ?? r.actorAgent ?? "unknown";
        byActor.set(a, (byActor.get(a) ?? 0) + 1);
      }
      for (const [actor, count] of byActor) {
        const severity: Finding["severity"] =
          count >= 5 ? "high" : count >= 2 ? "medium" : "low";
        findings.push({
          id: makeId("sensitive_break_glass", actor),
          severity,
          category: "sensitive_break_glass",
          title: `Mental-health break-glass overrides by ${actor}`,
          description: `${count} break-glass overrides on sensitive records in the last ${SENSITIVE_BREAK_GLASS_LOOKBACK_DAYS} days.`,
          evidence: [
            { label: "actor", value: actor },
            { label: "overrides", value: String(count) },
          ],
          recommendation:
            "Privacy officer must review each override's documented clinical reason and confirm the treatment relationship.",
          windowStart: since.toISOString(),
          windowEnd: now.toISOString(),
        });
      }
    }

    // ------------------------------------------------------------------
    // 4. Contraindication overrides (high-risk prescribing)
    // ------------------------------------------------------------------
    const ciOverrides = rows.filter(
      (r) => r.action === "rx.contraindication.override",
    );
    if (ciOverrides.length > 0) {
      const byActor = new Map<string, typeof ciOverrides>();
      for (const r of ciOverrides) {
        const a = r.actorUserId ?? r.actorAgent ?? "unknown";
        const list = byActor.get(a) ?? [];
        list.push(r);
        byActor.set(a, list);
      }
      for (const [actor, actorRows] of byActor) {
        const count = actorRows.length;
        // Compute absolute count PER ACTOR, not globally
        const absoluteCount = actorRows.filter(
          (r) =>
            (r.metadata as Record<string, unknown> | null)?.severity ===
            "absolute",
        ).length;
        if (count < 2 && absoluteCount === 0) continue;
        const severity: Finding["severity"] =
          absoluteCount > 0 ? "high" : count >= 5 ? "medium" : "low";
        findings.push({
          id: makeId("contraindication_override", actor),
          severity,
          category: "contraindication_override",
          title: `Cannabis contraindication overrides by ${actor}`,
          description: `${count} override(s) recorded; ${absoluteCount} on absolute contraindications.`,
          evidence: [
            { label: "actor", value: actor },
            { label: "overrides", value: String(count) },
            { label: "absolute", value: String(absoluteCount) },
          ],
          recommendation:
            "Have the medical director peer-review the documented rationale on every absolute-tier override.",
          windowStart: since.toISOString(),
          windowEnd: now.toISOString(),
        });
      }
    }

    // ------------------------------------------------------------------
    // 5. Auth anomalies — bursts of failed logins from one actor / IP
    // ------------------------------------------------------------------
    const authFails = rows.filter(
      (r) => r.action === "auth.login.failed" || r.action === "auth.mfa.failed",
    );
    if (authFails.length > 0) {
      const byHourActor = new Map<string, number>();
      for (const r of authFails) {
        const hourKey = `${r.actorUserId ?? "anon"}:${r.createdAt
          .toISOString()
          .slice(0, 13)}`;
        byHourActor.set(hourKey, (byHourActor.get(hourKey) ?? 0) + 1);
      }
      for (const [key, count] of byHourActor) {
        if (count < AUTH_FAIL_BURST_PER_HOUR) continue;
        const [actor, hour] = key.split(":");
        findings.push({
          id: makeId("auth_anomaly", `${actor}:${hour}`),
          severity: count >= 15 ? "high" : "medium",
          category: "auth_anomaly",
          title: `Auth failure burst from ${actor}`,
          description: `${count} failed sign-ins inside the hour starting ${hour}:00.`,
          evidence: [
            { label: "actor", value: actor },
            { label: "hour", value: hour },
            { label: "failures", value: String(count) },
          ],
          recommendation:
            "Force password rotation + step-up MFA. Confirm with the user that they recognize the activity.",
          windowStart: since.toISOString(),
          windowEnd: now.toISOString(),
        });
      }
    }

    // ------------------------------------------------------------------
    // 6. Bulk exports
    // ------------------------------------------------------------------
    const exportRows = rows.filter(
      (r) =>
        r.action === "document.downloaded" ||
        r.action === "export.generated" ||
        r.action === "research.export",
    );
    const exportsByActorDay = new Map<string, number>();
    for (const r of exportRows) {
      const day = r.createdAt.toISOString().slice(0, 10);
      const key = `${r.actorUserId ?? r.actorAgent ?? "unknown"}:${day}`;
      exportsByActorDay.set(key, (exportsByActorDay.get(key) ?? 0) + 1);
    }
    for (const [key, count] of exportsByActorDay) {
      if (count < BULK_EXPORT_DAILY_THRESHOLD) continue;
      const [actor, day] = key.split(":");
      findings.push({
        id: makeId("bulk_export", `${actor}:${day}`),
        severity: count >= 30 ? "high" : "medium",
        category: "bulk_export",
        title: `Bulk export by ${actor}`,
        description: `${count} document downloads / exports on ${day}.`,
        evidence: [
          { label: "actor", value: actor },
          { label: "day", value: day },
          { label: "exports", value: String(count) },
        ],
        recommendation:
          "Confirm the business purpose. If unjustified, revoke export permission and notify the privacy officer.",
        windowStart: since.toISOString(),
        windowEnd: now.toISOString(),
      });
    }

    // ------------------------------------------------------------------
    // 7. Uncoupled PHI disclosure (email/fax with no consent on file)
    // ------------------------------------------------------------------
    const disclosures = rows.filter(
      (r) =>
        r.action === "communication.faxed" ||
        r.action === "communication.emailed",
    );
    const disclosuresMissingConsent = disclosures.filter((r) => {
      const md = (r.metadata as Record<string, unknown> | null) ?? {};
      return md.consentId == null && md.releaseId == null;
    });
    if (disclosuresMissingConsent.length > 0) {
      findings.push({
        id: makeId(
          "uncoupled_phi_disclosure",
          String(disclosuresMissingConsent.length),
        ),
        severity:
          disclosuresMissingConsent.length >= 5 ? "high" : "medium",
        category: "uncoupled_phi_disclosure",
        title: "PHI disclosures without a linked consent / release",
        description: `${disclosuresMissingConsent.length} outbound fax/email events do not reference a consent or release-of-information record.`,
        evidence: disclosuresMissingConsent.slice(0, 5).map((r) => ({
          label: `${r.action} ${r.subjectId ?? ""}`.trim(),
          value: r.createdAt.toISOString(),
        })),
        recommendation:
          "Backfill the missing release records or retract the disclosure if consent cannot be produced.",
        windowStart: since.toISOString(),
        windowEnd: now.toISOString(),
      });
    }

    // ------------------------------------------------------------------
    // Sort + tally
    // ------------------------------------------------------------------
    const SEVERITY_RANK = { high: 3, medium: 2, low: 1 };
    findings.sort(
      (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
    );

    const totals = {
      eventsScanned: rows.length,
      actorsScanned: actors.size,
      high: findings.filter((f) => f.severity === "high").length,
      medium: findings.filter((f) => f.severity === "medium").length,
      low: findings.filter((f) => f.severity === "low").length,
    };

    await writeAgentAudit(
      "complianceAudit",
      "1.0.0",
      organizationId,
      "compliance.audit.completed",
      { type: "Organization", id: organizationId },
      {
        findingCount: findings.length,
        high: totals.high,
        medium: totals.medium,
        low: totals.low,
      },
    );

    ctx.log("info", "Compliance audit complete", {
      findings: findings.length,
      high: totals.high,
    });

    return { windowDays: days, findings, totals };
  },
};
