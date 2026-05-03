import Link from "next/link";
import {
  KeyRound,
  Terminal,
  Webhook,
  Gauge,
  ShieldCheck,
  ArrowRight,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export const metadata = {
  title: "Developers — Leafjourney",
  description:
    "Build on the Leafjourney platform — REST API, webhooks, sandbox orgs, and HIPAA-ready infrastructure.",
};

const QUICKSTART_STEPS = [
  {
    n: "01",
    Icon: KeyRound,
    title: "Provision a key",
    body: "Create a scoped API key from the operator admin panel. Start read-only.",
  },
  {
    n: "02",
    Icon: ShieldCheck,
    title: "Authenticate",
    body: "Send the key as a Bearer token in the Authorization header on every request.",
  },
  {
    n: "03",
    Icon: Terminal,
    title: "Call an endpoint",
    body: "Fetch patients, schedule appointments, or stream outcomes — scoped to your org.",
  },
];

type ApiEndpoint = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
};

const ENDPOINTS: ApiEndpoint[] = [
  { method: "GET", path: "/v1/patients", description: "List patients in your organization" },
  { method: "POST", path: "/v1/patients", description: "Create a new patient record" },
  { method: "GET", path: "/v1/patients/{id}", description: "Retrieve a single patient by ID" },
  { method: "PATCH", path: "/v1/patients/{id}", description: "Update demographics or care plan" },
  { method: "GET", path: "/v1/appointments", description: "List upcoming and past appointments" },
  { method: "POST", path: "/v1/appointments", description: "Schedule a new visit" },
  { method: "GET", path: "/v1/notes", description: "List clinical notes — supports server-side filtering" },
  { method: "POST", path: "/v1/outcomes", description: "Submit per-product outcome telemetry" },
  { method: "GET", path: "/v1/research/articles", description: "Search the curated PubMed knowledge base" },
];

const METHOD_TONE: Record<ApiEndpoint["method"], string> = {
  GET: "bg-emerald-100 text-emerald-700",
  POST: "bg-blue-100 text-blue-700",
  PATCH: "bg-amber-100 text-amber-700",
  DELETE: "bg-rose-100 text-rose-700",
};

const CURL_EXAMPLE = `curl https://api.leafjourney.com/v1/patients \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Accept: application/json"`;

const NODE_EXAMPLE = `import { Leafjourney } from "@leafjourney/sdk";

const lj = new Leafjourney({ apiKey: process.env.LEAFJOURNEY_KEY });

const patients = await lj.patients.list({ limit: 25 });
console.log(patients.data[0].displayName);`;

const RATE_LIMITS = [
  { scope: "Read endpoints", limit: "100 req / minute", burst: "Burst to 300" },
  { scope: "Write endpoints", limit: "30 req / minute", burst: "Burst to 60" },
  { scope: "Webhook delivery", limit: "Unmetered", burst: "Retries with exponential backoff" },
];

export default function DeveloperPortalPage() {
  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 20% 20%, var(--accent-soft), transparent 65%)," +
            "radial-gradient(ellipse 60% 50% at 90% 10%, var(--highlight-soft), transparent 60%)",
        }}
      />

      <SiteHeader />

      {/* Hero */}
      <section className="max-w-[1100px] mx-auto px-6 lg:px-12 pt-12 pb-16">
        <Eyebrow className="mb-6">Leafjourney developers</Eyebrow>
        <h1 className="font-display text-4xl md:text-6xl tracking-tight text-text leading-[1.05] max-w-3xl">
          Build on Leafjourney.
        </h1>
        <p className="text-[17px] md:text-lg text-text-muted mt-7 max-w-2xl leading-relaxed">
          The cannabis care platform with an API that doesn&apos;t get in your
          way. Scheduling, charts, outcomes, and AI agents — all addressable
          from your stack.
        </p>
        <div className="flex items-center gap-3 mt-8 flex-wrap">
          <Link href="/developer/docs">
            <Button size="lg">Read the docs</Button>
          </Link>
          <Link href="#quickstart">
            <Button size="lg" variant="secondary">
              Quick start
            </Button>
          </Link>
        </div>
        <div className="mt-8 flex items-center gap-3 text-sm text-text-muted flex-wrap">
          <Badge tone="success">v1 stable</Badge>
          <span>REST + webhooks</span>
          <span aria-hidden>•</span>
          <span>HIPAA BAA included</span>
          <span aria-hidden>•</span>
          <span>Sandbox in 60 seconds</span>
        </div>
      </section>

      <EditorialRule className="max-w-[1100px] mx-auto px-6 lg:px-12" />

      {/* Quick start */}
      <section id="quickstart" className="max-w-[1100px] mx-auto px-6 lg:px-12 py-16">
        <div className="max-w-2xl mb-10">
          <Eyebrow className="mb-3">Quick start</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
            Three steps to your first API call
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {QUICKSTART_STEPS.map((step) => {
            const Icon = step.Icon;
            return (
              <Card key={step.n} tone="raised" className="card-hover">
                <CardHeader>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                      <Icon className="w-5 h-5" strokeWidth={1.75} />
                    </div>
                    <span className="text-xs font-mono text-accent/60 tracking-wider">
                      STEP {step.n}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                  <CardDescription>{step.body}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <CodeBlock label="curl" snippet={CURL_EXAMPLE} />
          <CodeBlock label="Node.js" snippet={NODE_EXAMPLE} />
        </div>
      </section>

      <EditorialRule className="max-w-[1100px] mx-auto px-6 lg:px-12" />

      {/* Authentication */}
      <section
        id="authentication"
        className="max-w-[1100px] mx-auto px-6 lg:px-12 py-16"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          <div className="lg:col-span-1">
            <Eyebrow className="mb-3">Authentication</Eyebrow>
            <h2 className="font-display text-3xl text-text tracking-tight leading-[1.1]">
              Bearer tokens. Scoped. Rotatable.
            </h2>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-start gap-4 bg-surface-raised rounded-2xl border border-border p-6 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-medium text-text">
                  Every request requires a Bearer token
                </p>
                <p className="text-sm text-text-muted mt-1 leading-relaxed">
                  Pass{" "}
                  <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface-muted text-accent">
                    Authorization: Bearer sk_live_...
                  </code>{" "}
                  on every call. Rotate keys at any time from the operator
                  admin panel — old keys revoke instantly.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-surface-raised rounded-2xl border border-border p-6 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-medium text-text">
                  Scopes constrain what a key can touch
                </p>
                <p className="text-sm text-text-muted mt-1 leading-relaxed">
                  Start with{" "}
                  <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface-muted text-accent">
                    read:patients
                  </code>
                  . Add write scopes only when you need them. Every request
                  is logged in an immutable audit trail tied to the key&apos;s
                  scope.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <EditorialRule className="max-w-[1100px] mx-auto px-6 lg:px-12" />

      {/* Endpoint reference */}
      <section
        id="endpoints"
        className="max-w-[1100px] mx-auto px-6 lg:px-12 py-16"
      >
        <div className="max-w-2xl mb-10">
          <Eyebrow className="mb-3">Endpoint reference</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
            The most-used endpoints, at a glance
          </h2>
          <p className="text-text-muted mt-3 text-[15px] leading-relaxed">
            Full reference — including request/response schemas — lives in{" "}
            <Link href="/developer/docs" className="text-accent hover:underline">
              the docs
            </Link>
            .
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface-raised overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border bg-surface-muted text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
            <div className="col-span-2">Method</div>
            <div className="col-span-5">Path</div>
            <div className="col-span-5">Description</div>
          </div>
          <ul className="divide-y divide-border">
            {ENDPOINTS.map((ep) => (
              <li
                key={`${ep.method}-${ep.path}`}
                className="grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-surface-muted/40 transition-colors"
              >
                <div className="col-span-2">
                  <span
                    className={`inline-block text-[11px] font-mono font-semibold px-2 py-1 rounded ${METHOD_TONE[ep.method]}`}
                  >
                    {ep.method}
                  </span>
                </div>
                <code className="col-span-5 text-sm font-mono text-text break-all">
                  {ep.path}
                </code>
                <p className="col-span-5 text-sm text-text-muted">
                  {ep.description}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <Link
            href="/developer/docs"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            Full API reference
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      <EditorialRule className="max-w-[1100px] mx-auto px-6 lg:px-12" />

      {/* Rate limits */}
      <section
        id="rate-limits"
        className="max-w-[1100px] mx-auto px-6 lg:px-12 py-16"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          <div className="lg:col-span-1">
            <Eyebrow className="mb-3">Rate limits</Eyebrow>
            <h2 className="font-display text-3xl text-text tracking-tight leading-[1.1]">
              Generous defaults. Honest headers.
            </h2>
            <p className="text-text-muted mt-3 text-[15px] leading-relaxed">
              We return{" "}
              <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface-muted text-accent">
                X-RateLimit-Remaining
              </code>{" "}
              and{" "}
              <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface-muted text-accent">
                Retry-After
              </code>{" "}
              on every response. Respect them and you&apos;ll never get
              throttled.
            </p>
          </div>
          <div className="lg:col-span-2 space-y-3">
            {RATE_LIMITS.map((rl) => (
              <div
                key={rl.scope}
                className="flex items-center gap-4 bg-surface-raised rounded-2xl border border-border p-5 shadow-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <Gauge className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">{rl.scope}</p>
                  <p className="text-xs text-text-muted mt-0.5">{rl.burst}</p>
                </div>
                <p className="font-mono text-sm text-accent shrink-0">
                  {rl.limit}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <EditorialRule className="max-w-[1100px] mx-auto px-6 lg:px-12" />

      {/* Resource grid */}
      <section className="max-w-[1100px] mx-auto px-6 lg:px-12 py-16">
        <div className="max-w-2xl mb-10">
          <Eyebrow className="mb-3">Keep building</Eyebrow>
          <h2 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
            Guides, references, and a place to ask
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ResourceCard
            id="docs"
            Icon={BookOpen}
            title="API documentation"
            body="Full REST reference with request/response examples for every endpoint."
            href="/developer/docs"
            cta="Read docs"
          />
          <ResourceCard
            id="webhooks"
            Icon={Webhook}
            title="Webhooks guide"
            body="Subscribe to patient, appointment, and billing events with verified HMAC signatures."
            href="/developer/docs#webhooks"
            cta="Webhook docs"
          />
          <ResourceCard
            id="agents"
            Icon={Sparkles}
            title="AI agent SDK"
            body="Compose chart-aware AI agents with typed tools — same primitives that power our 13 in-product agents."
            href="/developer/docs#agents"
            cta="Agent SDK"
          />
          <ResourceCard
            id="status"
            Icon={Gauge}
            title="System status"
            body="Live service status and incident history — we publish everything."
            href="/status"
            cta="View status"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1100px] mx-auto px-6 lg:px-12 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-raised p-10 md:p-14 ambient">
          <div className="relative max-w-2xl">
            <Eyebrow className="mb-4">Ready to build?</Eyebrow>
            <h2 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-[1.1]">
              Get a sandbox in minutes
            </h2>
            <p className="text-[15px] text-text-muted mt-4 leading-relaxed">
              Sandbox orgs ship with realistic synthetic data — run your
              integration end-to-end without ever touching real PHI.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/sign-up">
                <Button size="lg">Create a sandbox</Button>
              </Link>
              <Link href="mailto:dev-support@leafjourney.com">
                <Button size="lg" variant="ghost">
                  Talk to a developer
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function CodeBlock({ label, snippet }: { label: string; snippet: string }) {
  return (
    <div className="rounded-xl bg-[#1a1f1c] overflow-hidden border border-black/20 shadow-md">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <span className="text-[11px] font-mono uppercase tracking-wider text-white/50">
          {label}
        </span>
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white/15" />
          <span className="w-2 h-2 rounded-full bg-white/15" />
          <span className="w-2 h-2 rounded-full bg-white/15" />
        </div>
      </div>
      <pre className="p-5 text-sm font-mono text-[#e8e6e1] overflow-x-auto leading-relaxed">
        <code>{snippet}</code>
      </pre>
    </div>
  );
}

function ResourceCard({
  id,
  Icon,
  title,
  body,
  href,
  cta,
}: {
  id: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: string | number }>;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <Card
      id={id}
      tone="raised"
      className="card-hover hover:shadow-lg transition-shadow"
    >
      <CardHeader>
        <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-3">
          <Icon className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
        >
          {cta}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}
