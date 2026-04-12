import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative } from "@/lib/utils/format";
import {
  AgentAvatar,
} from "@/components/ui/agent-signal";
import { resolveAgentMeta } from "@/lib/agents/ui-registry";
import type {
  PatientMemory,
  ClinicalObservation,
  MemoryKind,
  ObservationSeverity,
  ObservationCategory,
} from "@prisma/client";

/**
 * Memory Tab — the physician-facing surface that shows what the agentic
 * harness remembers about a patient. This is the "longitudinal
 * understanding" view. Three panels:
 *
 *   1. WHAT WE KNOW — grouped narrative memories (preferences, what's
 *      working, what isn't, concerns, trajectory). This is the clinical
 *      colleague whispering "here's who this person is."
 *
 *   2. WHAT THE TEAM IS NOTICING — recent observations from any agent,
 *      severity-ranked, with evidence links. The physician can
 *      acknowledge each one.
 *
 *   3. AGENT ACTIVITY — recent reasoning traces + feedback stats so the
 *      physician can see which agents are earning their trust.
 *
 * Everything here is read-mostly for V1. Acknowledging observations is
 * the one write path — future iterations will let physicians mark
 * memories as "not quite right" and re-train.
 */

interface MemoryTabProps {
  memories: PatientMemory[];
  observations: ClinicalObservation[];
  patientFirstName: string;
}

// ---------------------------------------------------------------------------
// Kind + severity display maps
// ---------------------------------------------------------------------------

const KIND_GROUPS: Array<{
  key: MemoryKind;
  title: string;
  blurb: string;
  accent: string;
}> = [
  {
    key: "concern",
    title: "Ongoing concerns",
    blurb: "What the team is keeping front of mind",
    accent: "border-l-danger",
  },
  {
    key: "working",
    title: "What's working",
    blurb: "Interventions that are genuinely helping",
    accent: "border-l-success/70",
  },
  {
    key: "not_working",
    title: "What hasn't worked",
    blurb: "Things already tried, so we don't re-suggest them",
    accent: "border-l-[color:var(--warning)]",
  },
  {
    key: "preference",
    title: "How they want to be cared for",
    blurb: "Stated or observed preferences",
    accent: "border-l-accent",
  },
  {
    key: "trajectory",
    title: "How things are trending",
    blurb: "Longitudinal direction of change",
    accent: "border-l-accent/60",
  },
  {
    key: "observation",
    title: "What the team has noticed",
    blurb: "Soft signals worth remembering",
    accent: "border-l-[color:var(--info)]",
  },
  {
    key: "relationship",
    title: "People in their life",
    blurb: "Family, other providers, support system",
    accent: "border-l-accent/40",
  },
  {
    key: "context",
    title: "Background we keep in mind",
    blurb: "Life context that shapes care",
    accent: "border-l-border-strong",
  },
  {
    key: "milestone",
    title: "Key moments",
    blurb: "Turning points worth remembering",
    accent: "border-l-highlight",
  },
];

const SEVERITY_STYLE: Record<
  ObservationSeverity,
  { tone: "danger" | "warning" | "info" | "accent"; label: string }
> = {
  urgent: { tone: "danger", label: "Urgent" },
  concern: { tone: "warning", label: "Concern" },
  notable: { tone: "info", label: "Notable" },
  info: { tone: "accent", label: "Info" },
};

const CATEGORY_LABEL: Record<ObservationCategory, string> = {
  symptom_trend: "Symptom trend",
  medication_response: "Medication response",
  adherence: "Adherence",
  emotional_state: "Emotional state",
  red_flag: "Red flag",
  positive_signal: "Positive signal",
  side_effect: "Side effect",
  lifestyle_shift: "Lifestyle",
  engagement: "Engagement",
  other: "Other",
};

// ---------------------------------------------------------------------------
// <MemoryTab />
// ---------------------------------------------------------------------------

export function MemoryTab({
  memories,
  observations,
  patientFirstName,
}: MemoryTabProps) {
  if (memories.length === 0 && observations.length === 0) {
    return (
      <EmptyState
        title="We're just getting to know them"
        description={`Memories and observations will accumulate here as ${patientFirstName}'s care team and AI colleagues work together over time. The longer the relationship, the richer this view becomes.`}
      />
    );
  }

  const groupedMemories = groupMemoriesByKind(memories);
  const openObservations = observations.filter((o) => !o.acknowledgedAt);
  const acknowledgedObservations = observations.filter(
    (o) => o.acknowledgedAt,
  );

  return (
    <div className="space-y-8">
      {/* Hero strip: what we remember, at a glance */}
      <MemoryHeroStrip
        memories={memories}
        observations={observations}
        patientFirstName={patientFirstName}
      />

      {/* Open observations — the "what the team is noticing" feed */}
      {openObservations.length > 0 && (
        <section>
          <SectionHeader
            title="Your team has been noticing"
            blurb="Recent observations from the agentic fleet — review and acknowledge."
          />
          <div className="space-y-3">
            {openObservations.map((obs) => (
              <ObservationCard key={obs.id} observation={obs} />
            ))}
          </div>
        </section>
      )}

      {/* What we know — grouped memories */}
      <section>
        <SectionHeader
          title={`What we remember about ${patientFirstName}`}
          blurb="The longitudinal understanding the team has built up over time. Every memory is versioned and attributed."
        />
        {memories.length === 0 ? (
          <p className="text-sm text-text-muted italic">
            No memories recorded yet. Nurse Nora and the rest of the fleet
            will start capturing what they learn as they interact with{" "}
            {patientFirstName}.
          </p>
        ) : (
          <div className="space-y-4">
            {KIND_GROUPS.map((group) => {
              const items = groupedMemories.get(group.key);
              if (!items || items.length === 0) return null;
              return (
                <MemoryGroup
                  key={group.key}
                  group={group}
                  memories={items}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Acknowledged observations — shown compact at the bottom */}
      {acknowledgedObservations.length > 0 && (
        <section>
          <SectionHeader
            title="Previously acknowledged"
            blurb="Observations the physician has already seen."
          />
          <div className="space-y-2">
            {acknowledgedObservations.slice(0, 8).map((obs) => (
              <AcknowledgedRow key={obs.id} observation={obs} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MemoryHeroStrip({
  memories,
  observations,
  patientFirstName,
}: {
  memories: PatientMemory[];
  observations: ClinicalObservation[];
  patientFirstName: string;
}) {
  const openObs = observations.filter((o) => !o.acknowledgedAt).length;
  const urgentObs = observations.filter(
    (o) => !o.acknowledgedAt && o.severity === "urgent",
  ).length;
  const concernObs = observations.filter(
    (o) => !o.acknowledgedAt && o.severity === "concern",
  ).length;
  const mostRecent = memories[0];

  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle mb-2">
            Longitudinal memory
          </p>
          <h2 className="font-display text-2xl text-text leading-tight">
            We remember{" "}
            <span className="text-accent">{memories.length}</span> thing
            {memories.length === 1 ? "" : "s"} about {patientFirstName}
          </h2>
          {mostRecent && (
            <p className="text-sm text-text-muted mt-2 leading-relaxed">
              Most recently: "{truncate(mostRecent.content, 140)}" —{" "}
              <span className="text-text-subtle">
                {formatRelative(mostRecent.createdAt.toISOString())}
              </span>
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {urgentObs > 0 && (
            <Badge tone="danger" className="text-[10px]">
              {urgentObs} urgent
            </Badge>
          )}
          {concernObs > 0 && (
            <Badge tone="warning" className="text-[10px]">
              {concernObs} concern{concernObs === 1 ? "" : "s"}
            </Badge>
          )}
          <Badge tone="accent" className="text-[10px]">
            {openObs} open observation{openObs === 1 ? "" : "s"}
          </Badge>
        </div>
      </div>
    </Card>
  );
}

function SectionHeader({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
}) {
  return (
    <div className="mb-3">
      <h3 className="font-display text-lg text-text leading-tight">{title}</h3>
      <p className="text-xs text-text-muted mt-1">{blurb}</p>
    </div>
  );
}

function MemoryGroup({
  group,
  memories,
}: {
  group: (typeof KIND_GROUPS)[number];
  memories: PatientMemory[];
}) {
  return (
    <Card className={`border-l-4 ${group.accent} p-4`}>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <div>
          <h4 className="font-display text-base text-text leading-tight">
            {group.title}
          </h4>
          <p className="text-[10px] uppercase tracking-wider text-text-subtle mt-0.5">
            {group.blurb}
          </p>
        </div>
        <span className="text-[11px] text-text-subtle tabular-nums">
          {memories.length}
        </span>
      </div>
      <ul className="space-y-2.5">
        {memories.map((m) => (
          <li key={m.id} className="text-[13px] text-text leading-relaxed">
            <p className="mb-1">{m.content}</p>
            <div className="flex items-center gap-1.5 text-[10px] text-text-subtle flex-wrap">
              <SourceBadge source={m.source} sourceKind={m.sourceKind} />
              <span>·</span>
              <span>{formatRelative(m.createdAt.toISOString())}</span>
              {m.confidence < 0.7 && (
                <>
                  <span>·</span>
                  <span className="italic">
                    {Math.round(m.confidence * 100)}% confidence
                  </span>
                </>
              )}
              {m.tags.length > 0 && (
                <>
                  <span>·</span>
                  <span className="text-text-subtle">
                    {m.tags.slice(0, 3).join(" · ")}
                  </span>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ObservationCard({
  observation,
}: {
  observation: ClinicalObservation;
}) {
  const style = SEVERITY_STYLE[observation.severity];
  const borderClass =
    observation.severity === "urgent"
      ? "border-l-4 border-l-danger"
      : observation.severity === "concern"
        ? "border-l-4 border-l-[color:var(--warning)]"
        : observation.severity === "notable"
          ? "border-l-4 border-l-[color:var(--info)]"
          : "border-l-4 border-l-accent/40";

  return (
    <Card className={`${borderClass} p-4`}>
      <div className="flex items-start gap-3">
        <SourceAvatar source={observation.observedBy} sourceKind={observation.observedByKind} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <Badge tone={style.tone} className="text-[10px]">
              {style.label}
            </Badge>
            <Badge tone="neutral" className="text-[10px]">
              {CATEGORY_LABEL[observation.category]}
            </Badge>
            <span className="text-[11px] text-text-subtle">
              {formatRelative(observation.createdAt.toISOString())}
            </span>
          </div>
          <p className="text-sm text-text leading-relaxed">
            {observation.summary}
          </p>
          {observation.actionSuggested && (
            <div className="mt-2 rounded-md bg-accent-soft/40 border border-accent/15 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-accent mb-0.5">
                Suggested action
              </p>
              <p className="text-[12px] text-text">
                {observation.actionSuggested}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function AcknowledgedRow({
  observation,
}: {
  observation: ClinicalObservation;
}) {
  return (
    <div className="flex items-center gap-3 text-[12px] text-text-muted opacity-70">
      <span className="text-text-subtle">✓</span>
      <span className="flex-1 truncate">{observation.summary}</span>
      <span className="text-[10px] text-text-subtle shrink-0">
        {observation.acknowledgedAt
          ? formatRelative(observation.acknowledgedAt.toISOString())
          : ""}
      </span>
    </div>
  );
}

function SourceBadge({
  source,
  sourceKind,
}: {
  source: string;
  sourceKind: string;
}) {
  if (sourceKind === "agent") {
    const meta = resolveAgentMeta(source);
    return (
      <span className="inline-flex items-center gap-1">
        <AgentAvatar meta={meta} size="xs" />
        <span>{meta.displayName}</span>
      </span>
    );
  }
  return <span>{source}</span>;
}

function SourceAvatar({
  source,
  sourceKind,
}: {
  source: string;
  sourceKind: string;
}) {
  if (sourceKind === "agent") {
    const meta = resolveAgentMeta(source);
    return <AgentAvatar meta={meta} size="sm" className="mt-0.5" />;
  }
  return (
    <div
      aria-hidden="true"
      className="h-7 w-7 rounded-full bg-surface-muted border border-border flex items-center justify-center text-[11px] text-text-subtle shrink-0 mt-0.5"
    >
      U
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupMemoriesByKind(
  memories: PatientMemory[],
): Map<MemoryKind, PatientMemory[]> {
  const out = new Map<MemoryKind, PatientMemory[]>();
  for (const m of memories) {
    const bucket = out.get(m.kind) ?? [];
    bucket.push(m);
    out.set(m.kind, bucket);
  }
  return out;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}
