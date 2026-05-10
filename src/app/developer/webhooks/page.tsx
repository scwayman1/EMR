import Link from "next/link";
import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Webhooks Guide — Leafjourney",
  description:
    "Subscribe to clinical and operational events with HMAC-verified webhooks.",
};

const EVENTS = [
  { name: "patient.created", desc: "Fires after a new patient record is provisioned." },
  { name: "patient.updated", desc: "Demographics, care plan, or consent state changed." },
  { name: "appointment.scheduled", desc: "A new visit is booked." },
  { name: "appointment.completed", desc: "Visit signed off by the clinician." },
  { name: "note.signed", desc: "Clinical note finalized — payload includes APSO sections." },
  { name: "outcome.recorded", desc: "Patient submitted a per-product outcome telemetry record." },
  { name: "billing.charge_created", desc: "Charge created for an encounter or service." },
];

export default function WebhooksDocsPage() {
  return (
    <div className="max-w-[960px] mx-auto px-6 lg:px-12 pt-12 pb-24">
      <Eyebrow className="mb-5">Webhooks guide</Eyebrow>
      <h1 className="font-display text-4xl md:text-5xl tracking-tight text-text leading-[1.05] mb-5">
        Real-time events from Leafjourney
      </h1>
      <p className="text-[17px] text-text-muted max-w-2xl leading-relaxed">
        Subscribe once, then your system stays in sync without polling. Every
        webhook is HMAC-signed, retried with exponential backoff, and tied to
        an immutable delivery log.
      </p>

      <EditorialRule className="my-12" />

      <section className="mb-12">
        <Eyebrow className="mb-3">How it works</Eyebrow>
        <div className="rounded-2xl border border-border bg-surface-raised p-6 text-sm text-text-muted leading-relaxed space-y-3">
          <p>
            Register an HTTPS endpoint from the operator admin panel. Pick the
            events you want; we&apos;ll deliver a JSON payload with a signature
            in the <code className="px-1.5 py-0.5 rounded bg-surface-muted text-accent font-mono text-xs">X-Leafjourney-Signature</code> header.
          </p>
          <p>
            Verify the signature against your shared secret and a 5-minute
            timestamp window. Respond <strong className="text-text">2xx</strong>{" "}
            within 10 seconds or we&apos;ll retry — first after 30s, then up to
            8 times with exponential backoff.
          </p>
          <p>
            Events arrive at-least-once. Use the{" "}
            <code className="px-1.5 py-0.5 rounded bg-surface-muted text-accent font-mono text-xs">event_id</code>{" "}
            field to deduplicate.
          </p>
        </div>
      </section>

      <section className="mb-12">
        <Eyebrow className="mb-3">Signature verification (Node.js)</Eyebrow>
        <pre className="text-sm font-mono bg-[#1a1f1c] text-[#e8e6e1] rounded-xl p-5 overflow-x-auto">
{`import { createHmac, timingSafeEqual } from "node:crypto";

const signature = req.headers["x-leafjourney-signature"];
const expected = createHmac("sha256", process.env.LJ_WEBHOOK_SECRET)
  .update(req.rawBody)
  .digest("hex");

if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
  return res.status(401).end();
}`}
        </pre>
      </section>

      <section className="mb-12">
        <Eyebrow className="mb-3">Event catalog</Eyebrow>
        <div className="rounded-2xl border border-border bg-surface-raised overflow-hidden">
          <ul className="divide-y divide-border">
            {EVENTS.map((e) => (
              <li
                key={e.name}
                className="grid grid-cols-12 gap-4 px-6 py-3 items-center"
              >
                <code className="col-span-5 text-sm font-mono text-accent">
                  {e.name}
                </code>
                <p className="col-span-7 text-sm text-text-muted">{e.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mb-12">
        <Eyebrow className="mb-3">How it integrates</Eyebrow>
        <div className="rounded-2xl border border-border bg-surface-raised p-6 text-sm text-text-muted leading-relaxed">
          Webhooks fire from the same event bus that powers in-product
          notifications. If a clinician signs a note, your{" "}
          <code className="px-1.5 py-0.5 rounded bg-surface-muted text-accent font-mono text-xs">note.signed</code>{" "}
          handler runs alongside Leafjourney&apos;s billing and outcome
          pipelines — no polling, no race conditions.
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/developer/sandbox">
          <Button size="lg">Try in a sandbox</Button>
        </Link>
        <Link href="/contact?role=Webhook%20Integration">
          <Button size="lg" variant="secondary">
            Talk to a developer
          </Button>
        </Link>
      </div>
    </div>
  );
}
