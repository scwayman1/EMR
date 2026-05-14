// EMR-087 — Legislative Advocacy Portal (patient-facing).
//
// Authenticated patient surface for messaging state and federal
// representatives. Patients pick an ask, the engine renders a draft
// letter that weaves the framing paragraphs around their personal
// story, and they can copy/email it out. Each rendered letter is
// shaped for the patient's voice — they edit before sending.

import Link from "next/link";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getTemplate,
  listAsks,
  lookupRepresentatives,
  renderLetter,
  type AdvocacyAsk,
  type PatientStory,
} from "@/lib/advocacy/representatives";

export const metadata = { title: "Advocacy" };

interface PageProps {
  searchParams: {
    state?: string;
    ask?: string;
    rep?: string;
    name?: string;
    condition?: string;
    story?: string;
  };
}

const SUPPORTED_STATES = ["CA", "CO", "NY", "TX"];

function parseAsk(raw: string | undefined): AdvocacyAsk {
  const valid: AdvocacyAsk[] = [
    "reclassification",
    "research_funding",
    "insurance_coverage",
    "patient_access",
    "veteran_access",
  ];
  return valid.includes(raw as AdvocacyAsk)
    ? (raw as AdvocacyAsk)
    : "patient_access";
}

const CHAMBER_LABEL: Record<string, string> = {
  us_senate: "US Senate",
  us_house: "US House",
  state_senate: "State Senate",
  state_assembly: "State Assembly",
};

export default function PatientAdvocacyPage({ searchParams }: PageProps) {
  const state = (searchParams.state ?? "").toUpperCase().slice(0, 2);
  const ask = parseAsk(searchParams.ask);
  const reps = state ? lookupRepresentatives(state) : [];
  const selectedRep = reps.find((r) => r.id === searchParams.rep) ?? reps[0];

  const story: PatientStory = {
    firstName: (searchParams.name ?? "").trim() || "—",
    state: state || "—",
    condition: (searchParams.condition ?? "").trim() || "—",
    story: (searchParams.story ?? "").trim() || "—",
  };

  const ready =
    state &&
    selectedRep &&
    story.firstName !== "—" &&
    story.condition !== "—" &&
    story.story !== "—";

  const letter = ready ? renderLetter(selectedRep, story, ask) : null;
  const template = getTemplate(ask);

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Advocacy"
        title="Message your representatives"
        description="Pick an ask, fill in your story, and we'll draft a letter to your state and federal representatives. You can edit before you send."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card tone="raised">
          <CardHeader>
            <CardTitle>1 · Your story</CardTitle>
            <CardDescription>
              Your name and a short paragraph in your own voice. This is what makes the
              letter feel real to the office that reads it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action="/portal/advocacy"
              method="get"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <label className="flex flex-col gap-1">
                <span className="text-xs text-text-subtle uppercase tracking-wider">
                  First name
                </span>
                <input
                  name="name"
                  defaultValue={searchParams.name ?? ""}
                  placeholder="Marcus"
                  className="bg-surface border border-border rounded-md px-3 py-2 text-sm"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-text-subtle uppercase tracking-wider">
                  Home state
                </span>
                <select
                  name="state"
                  defaultValue={state}
                  className="bg-surface border border-border rounded-md px-3 py-2 text-sm uppercase"
                  required
                >
                  <option value="">Select…</option>
                  {SUPPORTED_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="md:col-span-2 flex flex-col gap-1">
                <span className="text-xs text-text-subtle uppercase tracking-wider">
                  Condition
                </span>
                <input
                  name="condition"
                  defaultValue={searchParams.condition ?? ""}
                  placeholder="chronic neuropathic pain"
                  className="bg-surface border border-border rounded-md px-3 py-2 text-sm"
                  required
                />
              </label>
              <label className="md:col-span-2 flex flex-col gap-1">
                <span className="text-xs text-text-subtle uppercase tracking-wider">
                  Your experience (1–3 sentences)
                </span>
                <textarea
                  name="story"
                  defaultValue={searchParams.story ?? ""}
                  rows={3}
                  placeholder="Medical cannabis cut my opioid use in half. I'm asking for your help to protect that option for other patients like me."
                  className="bg-surface border border-border rounded-md px-3 py-2 text-sm"
                  required
                />
              </label>
              <label className="md:col-span-2 flex flex-col gap-1">
                <span className="text-xs text-text-subtle uppercase tracking-wider">
                  Ask
                </span>
                <select
                  name="ask"
                  defaultValue={ask}
                  className="bg-surface border border-border rounded-md px-3 py-2 text-sm"
                >
                  {listAsks().map((t) => (
                    <option key={t.ask} value={t.ask}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </label>
              {reps.length > 0 && (
                <label className="md:col-span-2 flex flex-col gap-1">
                  <span className="text-xs text-text-subtle uppercase tracking-wider">
                    Representative
                  </span>
                  <select
                    name="rep"
                    defaultValue={selectedRep?.id ?? ""}
                    className="bg-surface border border-border rounded-md px-3 py-2 text-sm"
                  >
                    {reps.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} — {CHAMBER_LABEL[r.chamber] ?? r.chamber}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="md:col-span-2 flex items-center gap-2 mt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent/90"
                >
                  Draft my letter →
                </button>
                <Link
                  href="/portal/advocacy"
                  className="text-sm text-text-muted hover:text-text"
                >
                  Reset
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card tone="raised">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>2 · Your draft letter</CardTitle>
                <CardDescription>
                  Edit before you send — this is a starting point, not a final draft.
                </CardDescription>
              </div>
              {letter && <Badge tone="accent">{template.ask.replace("_", " ")}</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {!ready ? (
              <p className="text-sm text-text-muted">
                Fill in the form and pick a state to generate your letter.
              </p>
            ) : letter && selectedRep ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-text-subtle uppercase tracking-wider">
                    To
                  </p>
                  <p className="text-sm text-text">{selectedRep.name}</p>
                  <p className="text-xs text-text-muted">
                    {CHAMBER_LABEL[selectedRep.chamber]} ·{" "}
                    <a
                      href={selectedRep.emailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      open contact form
                    </a>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-subtle uppercase tracking-wider">
                    Subject
                  </p>
                  <p className="text-sm font-medium text-text">{letter.subject}</p>
                </div>
                <div>
                  <p className="text-xs text-text-subtle uppercase tracking-wider">
                    Body
                  </p>
                  <pre className="text-sm text-text whitespace-pre-wrap leading-relaxed bg-surface-muted rounded-md p-3 border border-border/60">
                    {letter.body}
                  </pre>
                  <p className="text-[11px] text-text-subtle mt-1">
                    {letter.characters} characters
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={selectedRep.emailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-text text-surface hover:opacity-90"
                  >
                    Open contact form →
                  </a>
                  {selectedRep.phone && (
                    <a
                      href={`tel:${selectedRep.phone}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-surface border border-border hover:bg-surface-muted"
                    >
                      Call {selectedRep.phone}
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted">
                No representatives found for {state}. Try another state.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card tone="raised" className="mt-6">
        <CardHeader>
          <CardTitle>Why this works</CardTitle>
          <CardDescription>
            Real, personal letters from constituents move more votes than form emails. Your
            story is the most important part of the message.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-text-muted space-y-1.5">
            <li>· Keep it short — one page is plenty</li>
            <li>· Use your own voice; we will not send anything without your edits</li>
            <li>· Mention one specific way cannabis has affected you</li>
            <li>· Close with the ask in plain language</li>
          </ul>
        </CardContent>
      </Card>
    </PageShell>
  );
}
