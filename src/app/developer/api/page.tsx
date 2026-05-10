import Link from "next/link";
import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "API Documentation — Leafjourney",
  description:
    "REST API reference for Leafjourney: authentication, scopes, endpoints, and how it integrates with the platform.",
};

const ENDPOINT_GROUPS = [
  {
    name: "Patients",
    items: [
      { method: "GET", path: "/v1/patients", desc: "List patients in your org" },
      { method: "POST", path: "/v1/patients", desc: "Create a patient record" },
      { method: "GET", path: "/v1/patients/{id}", desc: "Retrieve one patient" },
      { method: "PATCH", path: "/v1/patients/{id}", desc: "Update demographics or care plan" },
    ],
  },
  {
    name: "Appointments",
    items: [
      { method: "GET", path: "/v1/appointments", desc: "List appointments" },
      { method: "POST", path: "/v1/appointments", desc: "Schedule a new visit" },
    ],
  },
  {
    name: "Notes & outcomes",
    items: [
      { method: "GET", path: "/v1/notes", desc: "List clinical notes" },
      { method: "POST", path: "/v1/outcomes", desc: "Submit per-product outcome telemetry" },
    ],
  },
  {
    name: "Research",
    items: [
      { method: "GET", path: "/v1/research/articles", desc: "Search the curated PubMed knowledge base" },
    ],
  },
];

const TONE: Record<string, string> = {
  GET: "bg-emerald-100 text-emerald-700",
  POST: "bg-blue-100 text-blue-700",
  PATCH: "bg-amber-100 text-amber-700",
  DELETE: "bg-rose-100 text-rose-700",
};

export default function APIDocsPage() {
  return (
    <div className="max-w-[960px] mx-auto px-6 lg:px-12 pt-12 pb-24">
      <Eyebrow className="mb-5">API documentation</Eyebrow>
      <h1 className="font-display text-4xl md:text-5xl tracking-tight text-text leading-[1.05] mb-5">
        The Leafjourney REST API
      </h1>
      <p className="text-[17px] text-text-muted max-w-2xl leading-relaxed">
        Every clinical and operational primitive in Leafjourney is addressable
        from your stack. This page is a one-pager: authentication, scopes, the
        endpoints you&apos;ll use most, and how the API plugs into the rest of
        the platform.
      </p>

      <EditorialRule className="my-12" />

      <section className="mb-12">
        <Eyebrow className="mb-3">Authentication</Eyebrow>
        <div className="rounded-2xl border border-border bg-surface-raised p-6">
          <p className="text-sm text-text-muted leading-relaxed">
            Send a Bearer token on every request:
          </p>
          <pre className="mt-3 text-sm font-mono bg-[#1a1f1c] text-[#e8e6e1] rounded-xl p-4 overflow-x-auto">
{`Authorization: Bearer sk_live_...`}
          </pre>
          <p className="text-sm text-text-muted leading-relaxed mt-4">
            Keys are scoped (e.g. <code className="px-1.5 py-0.5 rounded bg-surface-muted text-accent font-mono text-xs">read:patients</code>,
            {" "}<code className="px-1.5 py-0.5 rounded bg-surface-muted text-accent font-mono text-xs">write:notes</code>) and
            rotatable instantly from the operator admin panel.
          </p>
        </div>
      </section>

      <section className="mb-12">
        <Eyebrow className="mb-3">How it integrates</Eyebrow>
        <div className="rounded-2xl border border-border bg-surface-raised p-6 space-y-3 text-sm text-text-muted leading-relaxed">
          <p>
            The REST API operates on the same data plane the EMR&apos;s
            in-product surfaces use. A patient created by your integration is
            immediately visible in the clinician workspace.
          </p>
          <p>
            Webhook events are emitted for the same state changes — subscribe
            to <code className="px-1.5 py-0.5 rounded bg-surface-muted text-accent font-mono text-xs">patient.updated</code> or
            {" "}<code className="px-1.5 py-0.5 rounded bg-surface-muted text-accent font-mono text-xs">appointment.scheduled</code> to
            keep your system in sync without polling.
          </p>
          <p>
            AI Agent SDK calls are first-class: an agent can call any v1 endpoint
            scoped to the calling org.
          </p>
        </div>
      </section>

      <section className="mb-12">
        <Eyebrow className="mb-3">Endpoints</Eyebrow>
        <div className="space-y-6">
          {ENDPOINT_GROUPS.map((group) => (
            <div key={group.name} className="rounded-2xl border border-border bg-surface-raised overflow-hidden">
              <div className="px-6 py-3 border-b border-border bg-surface-muted">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-subtle">{group.name}</p>
              </div>
              <ul className="divide-y divide-border">
                {group.items.map((ep) => (
                  <li
                    key={`${ep.method}-${ep.path}`}
                    className="grid grid-cols-12 gap-4 px-6 py-3 items-center"
                  >
                    <span
                      className={`col-span-2 inline-block w-fit text-[11px] font-mono font-semibold px-2 py-1 rounded ${TONE[ep.method] ?? ""}`}
                    >
                      {ep.method}
                    </span>
                    <code className="col-span-5 text-sm font-mono text-text break-all">
                      {ep.path}
                    </code>
                    <p className="col-span-5 text-sm text-text-muted">
                      {ep.desc}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <Eyebrow className="mb-3">Errors &amp; rate limits</Eyebrow>
        <div className="rounded-2xl border border-border bg-surface-raised p-6 text-sm text-text-muted leading-relaxed">
          We use standard HTTP status codes and JSON bodies of the shape{" "}
          <code className="px-1.5 py-0.5 rounded bg-surface-muted text-accent font-mono text-xs">{`{ "error": { "type", "message", "request_id" } }`}</code>.
          Every response includes <code className="px-1.5 py-0.5 rounded bg-surface-muted text-accent font-mono text-xs">X-RateLimit-Remaining</code> and{" "}
          <code className="px-1.5 py-0.5 rounded bg-surface-muted text-accent font-mono text-xs">Retry-After</code> when relevant.
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/developer/sandbox">
          <Button size="lg">Try in a sandbox</Button>
        </Link>
        <Link href="/contact?role=Developer">
          <Button size="lg" variant="secondary">
            Talk to a developer
          </Button>
        </Link>
      </div>
    </div>
  );
}
