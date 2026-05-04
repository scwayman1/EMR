// EMR-56 — SMS reminder stubs for the scheduling module.
//
// The appointment-reminder agent already builds reminder *content* and
// stores tasks for human approval. This module is the thin send-side
// stub: it documents the contract for the SMS provider (Twilio is the
// likely first integration) and provides a fake implementation that
// records intent in our task table so flows can be wired end-to-end
// without a paid Twilio account during development.
//
// When Twilio (or AWS SNS) lands, replace `sendDevNoOpSms` with the
// real provider call. The interface is intentionally provider-shaped
// (`from`, `to`, `body`) so the swap is mechanical.

export interface SmsMessage {
  to: string; // E.164 — `+15552468`
  from?: string; // optional sender ID; provider default if omitted
  body: string;
  /** Free-text trace tag for logs (e.g. "appt-reminder-24h:42"). */
  traceTag?: string;
}

export interface SmsResult {
  ok: boolean;
  providerMessageId: string | null;
  error?: string;
}

/**
 * Default no-op send used in development. Logs the message and returns
 * a synthetic provider message id so callers can persist a "sent" row.
 */
export async function sendDevNoOpSms(msg: SmsMessage): Promise<SmsResult> {
  const id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.log(
      `[sms-stub] would send to=${msg.to} body="${msg.body.slice(0, 60)}…" trace=${msg.traceTag ?? "—"}`
    );
  }
  return { ok: true, providerMessageId: id };
}

/**
 * Public entry point. Picks the right transport based on env. Live
 * Twilio integration is gated on `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`
 * being present; otherwise we fall back to the dev no-op.
 */
export async function sendSms(msg: SmsMessage): Promise<SmsResult> {
  if (!msg.to.match(/^\+[1-9]\d{9,14}$/)) {
    return {
      ok: false,
      providerMessageId: null,
      error: `invalid E.164 number: ${msg.to}`,
    };
  }
  // Twilio is not yet wired in this branch. When it is, this guard
  // becomes the live path.
  // if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  //   return sendTwilioSms(msg);
  // }
  return sendDevNoOpSms(msg);
}

/**
 * Patient-facing self-service helpers. UI screens call these to let a
 * patient cancel or reschedule from a reminder SMS reply or web link.
 * Implementation lives in the scheduling actions; this file just
 * documents the surface.
 */
export interface SelfServiceLink {
  cancelUrl: string;
  rescheduleUrl: string;
}

export function selfServiceLinksFor(
  appointmentId: string,
  baseUrl: string = process.env.NEXT_PUBLIC_APP_URL ?? "https://leafjourney.com"
): SelfServiceLink {
  return {
    cancelUrl: `${baseUrl}/portal/appointments/${appointmentId}/cancel`,
    rescheduleUrl: `${baseUrl}/portal/appointments/${appointmentId}/reschedule`,
  };
}
