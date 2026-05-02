/**
 * EMR-090 — ER / hospital admission notification
 *
 * When a patient hits an ER or is admitted, our PCP/cannabis-care
 * provider should know within minutes — not when discharge paperwork
 * trickles back days later.
 *
 * The intake here is an ADT-style event (Admit / Discharge / Transfer).
 * Real production traffic would come from CCDA HL7 v2 ADT^A01 / A03 /
 * A04 / A08 messages, a HIE bridge (e.g., PointClickCare, Bamboo Health
 * PreManage, regional HIE feed), or a manual nurse upload. Whatever
 * the source, we normalize to AdtEvent and decide:
 *   - which providers in our org get notified
 *   - what channel (page, SMS, email, in-app)
 *   - what the message content looks like
 */

export type AdtEventType =
  | "admit"
  | "discharge"
  | "transfer"
  | "ed_arrival"
  | "ed_discharge";

export type AdtAcuity = "critical" | "urgent" | "routine";

export interface AdtEvent {
  /** Stable event id — caller-supplied, used for de-duplication */
  id: string;
  type: AdtEventType;
  occurredAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dob: string;
  };
  facility: {
    name: string;
    type: "hospital" | "ed" | "snf" | "rehab" | "other";
    /** Optional NPI / facility identifier */
    id?: string;
  };
  /** Free-text chief complaint or admission reason */
  reason: string;
  /** True if life-threatening — ICU, critical, level 1 trauma */
  critical?: boolean;
  /** Diagnostic codes already on the ADT */
  icd10?: string[];
  /** Optional attending name reported on the ADT */
  attendingName?: string;
}

export interface CareTeamMember {
  userId: string;
  firstName: string;
  lastName: string;
  /** Roles the user holds — used to decide if they should be paged. */
  roles: string[];
  /** Communication preferences */
  contact: {
    pageNumber?: string;
    smsNumber?: string;
    email?: string;
  };
  /** Quiet hours (24h, e.g., {start: 22, end: 6}) — non-critical events suppressed */
  quietHours?: { start: number; end: number };
}

export type NotificationChannel = "page" | "sms" | "email" | "in_app";

export interface AdmissionNotification {
  recipient: CareTeamMember;
  channel: NotificationChannel;
  acuity: AdtAcuity;
  subject: string;
  body: string;
  /** When to fire — usually now, but quiet-hours non-critical defers to morning */
  deliverAt: string;
  /** Why we picked this channel — for the audit log */
  reason: string;
}

const PAGE_ROLES = new Set([
  "attending",
  "primary_care",
  "primary",
  "pcp",
  "cannabis_md",
]);
const SMS_ROLES = new Set([
  "case_manager",
  "care_coordinator",
  "nurse",
  "rn",
]);

export interface PlanInput {
  event: AdtEvent;
  careTeam: CareTeamMember[];
  /** Defaults to event.occurredAt */
  now?: Date;
}

export function planNotifications(input: PlanInput): AdmissionNotification[] {
  const { event, careTeam } = input;
  const acuity = classifyAcuity(event);
  const now = input.now ?? new Date();

  const out: AdmissionNotification[] = [];

  for (const member of careTeam) {
    const channel = pickChannel(member, acuity);
    if (!channel) continue;

    const inQuietHours = isQuietHours(member.quietHours, now);
    const defer = inQuietHours && acuity !== "critical";
    const deliverAt = defer ? nextMorning(now, member.quietHours) : now;

    out.push({
      recipient: member,
      channel,
      acuity,
      subject: buildSubject(event, acuity),
      body: buildBody(event, acuity),
      deliverAt: deliverAt.toISOString(),
      reason: defer
        ? "Quiet hours — non-critical event deferred to next morning"
        : `Routed by acuity=${acuity}, role match`,
    });
  }

  return out.sort(
    (a, b) =>
      ACUITY_ORDER[b.acuity] - ACUITY_ORDER[a.acuity] ||
      a.deliverAt.localeCompare(b.deliverAt)
  );
}

const ACUITY_ORDER: Record<AdtAcuity, number> = {
  critical: 3,
  urgent: 2,
  routine: 1,
};

function classifyAcuity(event: AdtEvent): AdtAcuity {
  if (event.critical) return "critical";
  if (event.type === "admit" || event.type === "ed_arrival") {
    if (
      /chest pain|stroke|cva|sepsis|overdose|suicid|dka|stemi|trauma/i.test(
        event.reason
      )
    ) {
      return "critical";
    }
    return "urgent";
  }
  return "routine";
}

function pickChannel(
  member: CareTeamMember,
  acuity: AdtAcuity
): NotificationChannel | null {
  const roles = member.roles.map((r) => r.toLowerCase());
  const isPager = roles.some((r) => PAGE_ROLES.has(r));
  const isSms = roles.some((r) => SMS_ROLES.has(r));

  if (acuity === "critical" && isPager && member.contact.pageNumber) return "page";
  if (acuity === "critical" && member.contact.smsNumber) return "sms";

  if (acuity === "urgent") {
    if (isPager && member.contact.pageNumber) return "page";
    if (isSms && member.contact.smsNumber) return "sms";
    if (member.contact.email) return "email";
    return "in_app";
  }

  // Routine — prefer email or in-app
  if (member.contact.email) return "email";
  return "in_app";
}

function isQuietHours(
  qh: CareTeamMember["quietHours"],
  now: Date
): boolean {
  if (!qh) return false;
  const hour = now.getHours();
  if (qh.start === qh.end) return false;
  if (qh.start < qh.end) return hour >= qh.start && hour < qh.end;
  return hour >= qh.start || hour < qh.end;
}

function nextMorning(
  now: Date,
  qh: CareTeamMember["quietHours"]
): Date {
  const wakeHour = qh?.end ?? 7;
  const next = new Date(now);
  if (now.getHours() >= wakeHour) {
    next.setDate(next.getDate() + 1);
  }
  next.setHours(wakeHour, 0, 0, 0);
  return next;
}

function buildSubject(event: AdtEvent, acuity: AdtAcuity): string {
  const tag =
    acuity === "critical" ? "[CRITICAL] " : acuity === "urgent" ? "[URGENT] " : "";
  const verb =
    event.type === "admit"
      ? "Admitted"
      : event.type === "discharge"
        ? "Discharged"
        : event.type === "transfer"
          ? "Transferred"
          : event.type === "ed_arrival"
            ? "ED arrival"
            : "ED discharge";
  return `${tag}${event.patient.firstName} ${event.patient.lastName} — ${verb} at ${event.facility.name}`;
}

function buildBody(event: AdtEvent, acuity: AdtAcuity): string {
  const lines = [
    `Patient: ${event.patient.firstName} ${event.patient.lastName} (DOB ${event.patient.dob})`,
    `Event: ${event.type.replace("_", " ")} — ${new Date(event.occurredAt).toLocaleString()}`,
    `Facility: ${event.facility.name} (${event.facility.type.toUpperCase()})`,
    `Reason: ${event.reason}`,
  ];
  if (event.icd10?.length) lines.push(`Codes: ${event.icd10.join(", ")}`);
  if (event.attendingName) lines.push(`Attending: ${event.attendingName}`);
  if (acuity === "critical") {
    lines.push("");
    lines.push("Acknowledge in EMR within 30 min — escalates to backup if no response.");
  }
  return lines.join("\n");
}

/**
 * De-dupe key — same event id from the same source should not page twice.
 */
export function dedupeKey(event: AdtEvent): string {
  return `${event.facility.id ?? event.facility.name}:${event.id}:${event.type}`;
}
