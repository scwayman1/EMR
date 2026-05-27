import Link from "next/link";
import {
  ShieldCheck,
  ScrollText,
  KeyRound,
  Webhook,
  Bot,
  GitBranch,
  Building2,
  ArrowRight,
} from "lucide-react";
import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Developer Documentation — Leafjourney",
  description:
    "How to build on Leafjourney: partner requirements, vetting process, API, webhooks, and the AI agent SDK.",
};

const PARTNER_REQUIREMENTS = [
  {
    Icon: Building2,
    title: "Legitimate business entity",
    body:
      "Registered LLC, C-Corp, or comparable. We require an EIN and proof of liability insurance for clinical integrations.",
  },
  {
    Icon: ShieldCheck,
    title: "HIPAA-ready security posture",
    body:
      "Sign our Business Associate Agreement (BAA), demonstrate encryption at rest and in transit, and document access controls.",
  },
  {
    Icon: ScrollText,
    title: "Stated use case",
    body:
      "Tell us what you're building, who it's for, and what data you'll touch. Read-only, write, and AI-agent scopes are reviewed separately.",
  },
];

const VETTING_STEPS = [
  {
    n: "01",
    title: "Apply",
    body:
      "Tell us about your team, your product, and the integration scope. The CPO and CTO review every application.",
  },
  {
    n: "02",
    title: "Sandbox & build",
    body:
      "We provision a sandbox org with synthetic data so you can build end-to-end without ever touching real PHI.",
  },
  {
    n: "03",
    title: "Security review",
    body:
      "We review SOC2 controls, data handling, and your incident response runbook. BAA signed.",
  },
  {
    n: "04",
    title: "Production access",
    body:
      "Live keys issued, scoped to the smallest set of permissions you need. Audit logs are on by default.",
  },
];

export default function DeveloperDocsPage() {
  return (
    <div className="max-w-[1080px] mx-auto px-6 lg:px-12 pt-12 pb-24">
      <Eyebrow className="mb-5">Developer documentation</Eyebrow>
      <h1 className="font-display text-4xl md:text-5xl tracking-tight text-text leading-[1.05] mb-6">
        Build with Leafjourney.
      </h1>
      <p className="text-[17px] text-text-muted max-w-2xl leading-relaxed">
        This is the partner manual. It covers what we expect from a legitimate
        integration partner, how the vetting process works, and how the API,
        webhooks, and AI agent SDK fit together.
      </p>

      <EditorialRule className="my-12" />

      <section className="mb-16">
        <Eyebrow className="mb-3">Partner requirements</Eyebrow>
        <h2 className="font-display text-2xl md:text-3xl text-text tracking-tight mb-6">
          What it takes to integrate
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PARTNER_REQUIREMENTS.map((r) => {
            const Icon = r.Icon;
            return (
              <div
                key={r.title}
                className="rounded-2xl border border-border bg-surface-raised p-6 shadow-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <h3 className="font-display text-lg text-text mb-2">{r.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{r.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-16">
        <Eyebrow className="mb-3">Vetting process</Eyebrow>
        <h2 className="font-display text-2xl md:text-3xl text-text tracking-tight mb-6">
          From application to live keys
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {VETTING_STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-border bg-surface-raised p-6 shadow-sm"
            >
              <span className="text-xs font-mono text-accent">STEP {s.n}</span>
              <h3 className="font-display text-lg text-text mt-1.5 mb-2">{s.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <Eyebrow className="mb-3">How the platform fits together</Eyebrow>
        <h2 className="font-display text-2xl md:text-3xl text-text tracking-tight mb-6">
          Three surfaces, one platform
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <SurfaceCard
            Icon={KeyRound}
            title="REST API"
            href="/developer/api"
            body="Patients, appointments, notes, outcomes, and research. Bearer-token auth, scoped keys, full audit trail."
          />
          <SurfaceCard
            Icon={Webhook}
            title="Webhooks"
            href="/developer/webhooks"
            body="Subscribe to clinical and operational events. Verified HMAC signatures, retries with exponential backoff."
          />
          <SurfaceCard
            Icon={Bot}
            title="AI Agent SDK"
            href="/developer/agent-sdk"
            body="Compose chart-aware AI agents with the same primitives that power our 13 in-product agents."
          />
        </div>
      </section>

      <section className="mb-16">
        <Eyebrow className="mb-3">Versioning &amp; stability</Eyebrow>
        <div className="rounded-2xl border border-border bg-surface-raised p-6">
          <p className="text-sm text-text-muted leading-relaxed">
            We version the API by URL prefix (<code className="px-1.5 py-0.5 rounded bg-surface-muted text-accent font-mono text-xs">/v1</code>). Breaking
            changes get a new prefix; additive changes ship in-place. Webhook
            payload schemas follow the same versioning. Deprecations come with
            a <strong className="text-text">six-month</strong> support window
            and migration notes.
          </p>
        </div>
      </section>

      <section className="mb-16">
        <Eyebrow className="mb-3">Audit, logs, and observability</Eyebrow>
        <div className="rounded-2xl border border-border bg-surface-raised p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <GitBranch className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-medium text-text">
              Every API call is logged
            </p>
            <p className="text-sm text-text-muted leading-relaxed mt-1">
              Tied to the calling key&apos;s scope, an immutable trail with
              timestamp, request ID, response code, and originating IP. Logs
              are exportable from the operator admin panel.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface-raised p-10 md:p-12 text-center">
        <h2 className="font-display text-3xl text-text tracking-tight mb-3">
          Ready to apply?
        </h2>
        <p className="text-text-muted max-w-xl mx-auto mb-7 leading-relaxed">
          Tell us what you&apos;re building. The CPO and CTO review every
          application personally.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/developer/sandbox">
            <Button size="lg">Create a sandbox</Button>
          </Link>
          <Link href="/contact?role=Developer%20Partner">
            <Button size="lg" variant="secondary">
              Talk to a developer
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function SurfaceCard({
  Icon,
  title,
  body,
  href,
}: {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: string | number }>;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-border bg-surface-raised p-6 shadow-sm hover:border-accent/60 hover:-translate-y-0.5 transition-all"
    >
      <div className="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4">
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <h3 className="font-display text-lg text-text mb-2">{title}</h3>
      <p className="text-sm text-text-muted leading-relaxed mb-3">{body}</p>
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
        Open <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </span>
    </Link>
  );
}
