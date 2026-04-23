import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/ornament";

export const metadata = { title: "Developers — Leafjourney" };

export default function DeveloperPortalPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 50% 60% at 20% 20%, var(--accent-soft), transparent 65%)," +
              "radial-gradient(ellipse 60% 50% at 90% 10%, var(--highlight-soft), transparent 60%)",
          }}
        />
        <div className="max-w-[1100px] mx-auto px-6 lg:px-12 py-20">
          <Eyebrow className="mb-4">Leafjourney developers</Eyebrow>
          <h1 className="font-display text-4xl md:text-6xl tracking-tight text-text leading-[1.05] max-w-3xl">
            Build on Leafjourney.
          </h1>
          <p className="text-lg text-text-muted mt-5 max-w-2xl leading-relaxed">
            The cannabis care platform with an API that doesn't get in your way. Scheduling,
            charts, outcomes, and AI agents — all addressable from your stack.
          </p>
          <div className="flex items-center gap-3 mt-8">
            <Link href="/developer/docs">
              <Button size="lg">Read the docs</Button>
            </Link>
            <Link href="#quickstart">
              <Button size="lg" variant="secondary">
                Quick start
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-4 text-sm text-text-muted">
            <Badge tone="success">v1 stable</Badge>
            <span>REST + webhooks</span>
            <span>•</span>
            <span>HIPAA BAA included</span>
          </div>
        </div>
      </section>

      {/* Quick start */}
      <section id="quickstart" className="max-w-[1100px] mx-auto px-6 lg:px-12 py-16">
        <Eyebrow className="mb-3">Quick start</Eyebrow>
        <h2 className="font-display text-3xl text-text tracking-tight mb-10">
          Three steps to your first API call
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              n: "01",
              title: "Create a key",
              body: "Sign in and provision an API key from the operator admin panel. Scope it read-only to start.",
            },
            {
              n: "02",
              title: "Authenticate",
              body: "Send the key in the Authorization header as a Bearer token with every request.",
            },
            {
              n: "03",
              title: "Call an endpoint",
              body: "Fetch patients, appointments, or outcomes. Everything's scoped to your org.",
            },
          ].map((step) => (
            <Card key={step.n} tone="raised">
              <CardHeader>
                <div className="text-xs font-mono text-accent tracking-wider">
                  STEP {step.n}
                </div>
                <CardTitle className="mt-2">{step.title}</CardTitle>
                <CardDescription>{step.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-8" tone="ambient">
          <CardContent className="pt-6">
            <pre className="bg-neutral-900 text-neutral-100 rounded-md p-4 text-sm font-mono overflow-x-auto">
{`curl https://api.leafjourney.com/v1/patients \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Accept: application/json"`}
            </pre>
          </CardContent>
        </Card>
      </section>

      {/* Resource grid */}
      <section className="max-w-[1100px] mx-auto px-6 lg:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ResourceCard
            id="docs"
            title="API documentation"
            body="Full REST reference with request/response examples for every endpoint."
            href="/developer/docs"
            cta="Read docs →"
          />
          <ResourceCard
            id="webhooks"
            title="Webhooks guide"
            body="Subscribe to patient, appointment, and billing events with verified HMAC signatures."
            href="/developer/docs#webhooks"
            cta="Webhook docs →"
          />
          <ResourceCard
            id="auth"
            title="Authentication"
            body="Bearer tokens, scopes, rate limits by scope, and how to rotate keys safely."
            href="/developer/docs#auth"
            cta="Auth guide →"
          />
          <ResourceCard
            id="rate-limits"
            title="Rate limits"
            body="100 rpm read, 30 rpm write. Burst up to 300. Respect the Retry-After header."
            href="/developer/docs#rate-limits"
            cta="Limits →"
          />
          <ResourceCard
            id="support"
            title="Support"
            body="Office hours every Tuesday at 10am PT. Email dev-support@leafjourney.com."
            href="mailto:dev-support@leafjourney.com"
            cta="Email us →"
          />
          <ResourceCard
            id="status"
            title="System status"
            body="Live service status and incident history — we publish everything."
            href="/status"
            cta="View status →"
          />
        </div>
      </section>

      <section className="border-t border-border">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-12 py-16 text-center">
          <Eyebrow className="mb-3 justify-center">Ready to build?</Eyebrow>
          <h2 className="font-display text-3xl text-text tracking-tight mb-4">
            Get a sandbox in minutes
          </h2>
          <p className="text-text-muted mb-6 max-w-xl mx-auto">
            Sandbox orgs have realistic fake data — run your integrations end-to-end without
            touching real PHI.
          </p>
          <Link href="/signup">
            <Button size="lg">Create a sandbox</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function ResourceCard({
  id,
  title,
  body,
  href,
  cta,
}: {
  id: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <Card id={id} tone="raised" className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          href={href}
          className="text-sm font-medium text-accent hover:underline"
        >
          {cta}
        </Link>
      </CardContent>
    </Card>
  );
}
