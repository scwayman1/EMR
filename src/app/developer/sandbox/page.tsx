import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import { SandboxPlayground } from "./sandbox-playground";
import { ShieldCheck, Lock, FlaskConical } from "lucide-react";

export const metadata = {
  title: "Developer Sandbox — Leafjourney",
  description:
    "Mock-test your integration against the Leafjourney API without touching real PHI.",
};

const ASSURANCES = [
  {
    Icon: Lock,
    title: "Isolated infrastructure",
    body:
      "Sandbox runs on its own database and key material — no path to production data, no shared encryption keys.",
  },
  {
    Icon: ShieldCheck,
    title: "Synthetic data only",
    body:
      "All patients, notes, and outcomes are fabricated. PHI from the live system is never replayed here.",
  },
  {
    Icon: FlaskConical,
    title: "Two free prompts",
    body:
      "Each visitor gets two mock runs to feel out the API surface. After that, talk to a developer for full sandbox access.",
  },
];

export default function DeveloperSandboxPage() {
  return (
    <div className="max-w-[960px] mx-auto px-6 lg:px-12 pt-12 pb-24">
      <Eyebrow className="mb-5">Developer sandbox</Eyebrow>
      <h1 className="font-display text-4xl md:text-5xl tracking-tight text-text leading-[1.05] mb-5">
        Mock-test your integration in seconds.
      </h1>
      <p className="text-[17px] text-text-muted max-w-2xl leading-relaxed">
        Try the Leafjourney API against synthetic data. The sandbox lives on
        its own server and uses separate encryption — there is no path from
        here back into the live database.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10">
        {ASSURANCES.map((a) => {
          const Icon = a.Icon;
          return (
            <div
              key={a.title}
              className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-3">
                <Icon className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <h3 className="font-display text-lg text-text mb-1.5">{a.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{a.body}</p>
            </div>
          );
        })}
      </div>

      <EditorialRule className="my-12" />

      <SandboxPlayground />
    </div>
  );
}
