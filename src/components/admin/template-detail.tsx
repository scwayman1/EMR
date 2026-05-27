import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
// TODO(EMR-429): replace local manifest shape with the canonical
// `SpecialtyManifest` import once the schema branch lands.
import type { SpecialtyManifest } from "@/lib/specialty-templates/manifest-schema";

export interface DependentPractice {
  id: string;
  name: string;
  /** Internal href to the practice configuration view. Super-admin only. */
  configHref: string;
}

export interface TemplateDetailProps {
  manifest: SpecialtyManifest;
  dependentPractices: DependentPractice[];
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/80 bg-surface px-6 py-5 shadow-sm">
      <header className="mb-3">
        <h2 className="font-display text-base font-medium text-text tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="text-xs text-text-subtle mt-0.5">{description}</p>
        ) : null}
      </header>
      <div className="text-sm text-text">{children}</div>
    </section>
  );
}

function StringList({
  items,
  emptyLabel,
}: {
  items: ReadonlyArray<string | { id?: string; label?: string; name?: string }> | undefined;
  emptyLabel: string;
}) {
  if (!items || items.length === 0) {
    return <p className="text-xs text-text-subtle italic">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item, idx) => {
        const text =
          typeof item === "string"
            ? item
            : item.label ?? item.name ?? item.id ?? `Item ${idx + 1}`;
        const id = typeof item === "string" ? `${text}-${idx}` : item.id ?? `${text}-${idx}`;
        return (
          <li
            key={id}
            className="flex items-start gap-2 rounded-md bg-surface-muted/60 px-3 py-1.5 text-sm"
          >
            <span aria-hidden className="text-text-subtle mt-0.5">•</span>
            <span className="text-text">{text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function ModalityColumn({
  title,
  tone,
  modalities,
}: {
  title: string;
  tone: "accent" | "neutral";
  modalities: ReadonlyArray<{ id: string; label?: string }> | undefined;
}) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
        {title} ({modalities?.length ?? 0})
      </h3>
      {!modalities || modalities.length === 0 ? (
        <p className="text-xs text-text-subtle italic">None</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {modalities.map((m) => (
            <Badge key={m.id} tone={tone}>
              {m.label ?? m.id}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function TemplateDetail({
  manifest,
  dependentPractices,
}: TemplateDetailProps) {
  const m = manifest as unknown as {
    name: string;
    slug: string;
    version: string;
    description?: string;
    icon?: string;
    careModel?: { label?: string; description?: string; type?: string } | string;
    modalities?: {
      included?: ReadonlyArray<{ id: string; label?: string }>;
      excluded?: ReadonlyArray<{ id: string; label?: string }>;
    };
    workflows?: ReadonlyArray<string | { id?: string; label?: string; name?: string }>;
    chartingTemplates?: ReadonlyArray<string | { id?: string; label?: string; name?: string }>;
    missionControlCards?: ReadonlyArray<string | { id?: string; label?: string; name?: string }>;
    patientPortalCards?: ReadonlyArray<string | { id?: string; label?: string; name?: string }>;
    migrationMappingDefaults?: unknown;
  };

  const careModelLabel =
    typeof m.careModel === "string"
      ? m.careModel
      : m.careModel?.label ?? m.careModel?.type;
  const careModelDescription =
    typeof m.careModel === "string" ? undefined : m.careModel?.description;

  return (
    <div className="space-y-5">
      <Section title="Header">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">
              Name
            </dt>
            <dd className="mt-0.5 flex items-center gap-2 font-medium">
              {m.icon ? <span aria-hidden>{m.icon}</span> : null}
              {m.name}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">
              Slug
            </dt>
            <dd className="mt-0.5 font-mono text-xs text-text-muted">
              {m.slug}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">
              Version
            </dt>
            <dd className="mt-0.5">{m.version}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">
              Icon
            </dt>
            <dd className="mt-0.5">{m.icon ?? "—"}</dd>
          </div>
          {m.description ? (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-text-muted">
                Description
              </dt>
              <dd className="mt-0.5 text-sm">{m.description}</dd>
            </div>
          ) : null}
        </dl>
      </Section>

      <Section title="Care model">
        {careModelLabel ? (
          <>
            <p className="font-medium">{careModelLabel}</p>
            {careModelDescription ? (
              <p className="text-text-muted text-sm mt-1">
                {careModelDescription}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-xs text-text-subtle italic">No care model defined.</p>
        )}
      </Section>

      <Section title="Modalities">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ModalityColumn
            title="Included"
            tone="accent"
            modalities={m.modalities?.included}
          />
          <ModalityColumn
            title="Excluded"
            tone="neutral"
            modalities={m.modalities?.excluded}
          />
        </div>
      </Section>

      <Section title="Workflows">
        <StringList items={m.workflows} emptyLabel="No workflows defined." />
      </Section>

      <Section title="Charting templates">
        <StringList
          items={m.chartingTemplates}
          emptyLabel="No charting templates defined."
        />
      </Section>

      <Section title="Mission Control cards">
        <StringList
          items={m.missionControlCards}
          emptyLabel="No Mission Control cards defined."
        />
      </Section>

      <Section title="Patient portal cards">
        <StringList
          items={m.patientPortalCards}
          emptyLabel="No patient portal cards defined."
        />
      </Section>

      <Section
        title="Migration mapping defaults"
        description="Read-only defaults used by the importer when mapping legacy data into this template."
      >
        <details className="group rounded-md border border-border/70 bg-surface-muted/40">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-text-muted hover:text-text">
            Show JSON
          </summary>
          <pre className="px-3 pb-3 pt-1 text-xs leading-relaxed overflow-auto max-h-96">
            {JSON.stringify(m.migrationMappingDefaults ?? {}, null, 2)}
          </pre>
        </details>
      </Section>

      <Section
        title={`Dependent practices (${dependentPractices.length})`}
        description="Published practice configurations that selected this specialty."
      >
        <DependentPracticesPanel practices={dependentPractices} />
      </Section>
    </div>
  );
}

function DependentPracticesPanel({
  practices,
}: {
  practices: DependentPractice[];
}) {
  // Server component renders this; toggle via <details> so we don't ship JS.
  if (practices.length === 0) {
    return (
      <p className="text-xs text-text-subtle italic">
        No published practices currently use this template.
      </p>
    );
  }
  return (
    <details className="group">
      <summary className="cursor-pointer text-sm font-medium text-accent hover:underline">
        Show practices
      </summary>
      <ul className="mt-3 space-y-1.5">
        {practices.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-md border border-border/70 bg-surface-muted/60 px-3 py-2"
          >
            <span className="text-sm text-text">{p.name}</span>
            <Link
              href={p.configHref}
              className="text-xs text-accent hover:underline"
            >
              View configuration
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
