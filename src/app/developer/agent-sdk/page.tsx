import Link from "next/link";
import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "AI Agent SDK — Leafjourney",
  description:
    "Compose chart-aware AI agents with the same primitives that power our 13 in-product agents.",
};

export default function AgentSDKDocsPage() {
  return (
    <div className="max-w-[960px] mx-auto px-6 lg:px-12 pt-12 pb-24">
      <Eyebrow className="mb-5">AI Agent SDK</Eyebrow>
      <h1 className="font-display text-4xl md:text-5xl tracking-tight text-text leading-[1.05] mb-5">
        Build chart-aware AI agents
      </h1>
      <p className="text-[17px] text-text-muted max-w-2xl leading-relaxed">
        The Leafjourney AI Agent SDK is the same toolkit our team uses to ship
        the 13 in-product agents. You define typed tools, hand them to a
        configured model, and the agent operates inside the safety perimeter
        of your scoped key.
      </p>

      <EditorialRule className="my-12" />

      <section className="mb-12">
        <Eyebrow className="mb-3">Quick example</Eyebrow>
        <pre className="text-sm font-mono bg-[#1a1f1c] text-[#e8e6e1] rounded-xl p-5 overflow-x-auto">
{`import { createAgent } from "@leafjourney/agent-sdk";

const triage = createAgent({
  apiKey: process.env.LEAFJOURNEY_KEY,
  model: "claude-opus-4-7",
  tools: [
    "patients.find",
    "research.search",
    "interactions.check",
  ],
  guardrails: {
    requirePhysicianApproval: ["notes.write", "rx.draft"],
  },
});

const result = await triage.run({
  prompt: "Summarize the last 90 days for patient #PT-1042 and flag any "
    + "interactions between their meds and a CBD start.",
});`}
        </pre>
      </section>

      <section className="mb-12">
        <Eyebrow className="mb-3">What the SDK gives you</Eyebrow>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Capability
            title="Typed tools"
            body="Every Leafjourney API endpoint is exposed as a typed tool. Your agent gets schema-checked inputs and structured outputs."
          />
          <Capability
            title="Scoped to your org"
            body="Agents inherit the calling key's scope — they can't see data the key can't see, even if the model tries."
          />
          <Capability
            title="Approval gates"
            body="Mark any tool as physician-gated. The agent drafts; the clinician approves. The platform handles the queue."
          />
          <Capability
            title="Audit trail"
            body="Every tool call is logged with the prompt, the model output, and the resulting state change. Replay is one click."
          />
        </div>
      </section>

      <section className="mb-12">
        <Eyebrow className="mb-3">How it integrates</Eyebrow>
        <div className="rounded-2xl border border-border bg-surface-raised p-6 text-sm text-text-muted leading-relaxed space-y-3">
          <p>
            Agents are first-class citizens of the platform. A triage agent you
            build can drop a draft note into the clinician&apos;s queue exactly
            the way our in-product agents do.
          </p>
          <p>
            The SDK ships with an evaluation harness so you can score agent
            outputs against held-out chart fixtures before promoting changes.
          </p>
          <p>
            Models are pluggable. Default is Claude Opus; bring your own key
            for OpenRouter, OpenAI, or a self-hosted endpoint.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/developer/sandbox">
          <Button size="lg">Try in a sandbox</Button>
        </Link>
        <Link href="/contact?role=AI%20Agent%20SDK">
          <Button size="lg" variant="secondary">
            Talk to a developer
          </Button>
        </Link>
      </div>
    </div>
  );
}

function Capability({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-6 shadow-sm">
      <h3 className="font-display text-lg text-text mb-2">{title}</h3>
      <p className="text-sm text-text-muted leading-relaxed">{body}</p>
    </div>
  );
}
