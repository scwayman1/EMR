// EMR-086 — Community Resource Connector (clinician view).
//
// Search-and-match UI on top of `lib/domain/community-resources` +
// `lib/clinical/community-resources`. The clinician enters the
// patient's conditions and location, the engine returns ranked
// resources, and a "build handoff" link previews the patient-facing
// message a clinician can paste into a portal note or text.

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
import { StatCard } from "@/components/ui/stat-card";
import {
  matchResources,
  buildPatientHandoff,
} from "@/lib/clinical/community-resources";
import {
  COMMUNITY_RESOURCES,
  type ConditionCategory,
} from "@/lib/domain/community-resources";

export const metadata = { title: "Community resources" };

interface PageProps {
  searchParams: {
    conditions?: string;
    city?: string;
    state?: string;
    region?: string;
    free?: string;
    preview?: string;
  };
}

const CATEGORY_OPTIONS: { value: ConditionCategory; label: string }[] = [
  { value: "dementia", label: "Dementia" },
  { value: "cancer", label: "Cancer" },
  { value: "chronic_pain", label: "Chronic pain" },
  { value: "mental_health", label: "Mental health" },
  { value: "ms", label: "Multiple sclerosis" },
  { value: "epilepsy", label: "Epilepsy" },
  { value: "ptsd", label: "PTSD" },
  { value: "addiction", label: "Addiction" },
];

export default function CommunityResourcesPage({ searchParams }: PageProps) {
  const conditionsRaw = (searchParams.conditions ?? "").trim();
  const conditions = conditionsRaw
    ? conditionsRaw.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
    : [];

  const preferFree = searchParams.free === "1";

  const matches =
    conditions.length === 0
      ? []
      : matchResources({
          conditions,
          patientCity: searchParams.city || undefined,
          patientState: searchParams.state || undefined,
          patientRegion: searchParams.region || undefined,
          preferFree,
          limit: 12,
        });

  const previewMatch =
    searchParams.preview && matches.find((m) => m.resource.id === searchParams.preview);

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Care coordination"
        title="Community resources"
        description="Curated, condition-keyed registry of community organizations. Enter the patient's conditions and location to surface ranked matches plus a patient-facing handoff message."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Resources in registry"
          value={String(COMMUNITY_RESOURCES.length)}
          size="md"
        />
        <StatCard
          label="Categories covered"
          value={String(CATEGORY_OPTIONS.length)}
          size="md"
          tone="info"
        />
        <StatCard
          label="Free programs"
          value={String(
            COMMUNITY_RESOURCES.filter((r) => r.feeStructure === "free").length,
          )}
          size="md"
          tone="success"
        />
        <StatCard
          label="National coverage"
          value={String(COMMUNITY_RESOURCES.filter((r) => r.national).length)}
          size="md"
          tone="neutral"
        />
      </div>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>1 · Patient context</CardTitle>
          <CardDescription>
            Comma-separate conditions (ICD-10 codes or plain text). Filling in location
            sharpens proximity ranking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action="/clinic/community-resources"
            method="get"
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <label className="md:col-span-2 flex flex-col gap-1">
              <span className="text-xs text-text-subtle uppercase tracking-wider">
                Conditions
              </span>
              <input
                name="conditions"
                defaultValue={conditionsRaw}
                placeholder="dementia, F03, caregiver stress"
                className="bg-surface border border-border rounded-md px-3 py-2 text-sm"
              />
              <span className="text-[11px] text-text-subtle">
                ICD-10 prefixes (F03, C70, G35…) and plain-text keywords both work.
              </span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-subtle uppercase tracking-wider">
                City
              </span>
              <input
                name="city"
                defaultValue={searchParams.city ?? ""}
                placeholder="Irvine"
                className="bg-surface border border-border rounded-md px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-subtle uppercase tracking-wider">
                State
              </span>
              <input
                name="state"
                defaultValue={searchParams.state ?? ""}
                placeholder="CA"
                maxLength={2}
                className="bg-surface border border-border rounded-md px-3 py-2 text-sm uppercase"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-text-subtle uppercase tracking-wider">
                Region (optional)
              </span>
              <input
                name="region"
                defaultValue={searchParams.region ?? ""}
                placeholder="Orange County"
                className="bg-surface border border-border rounded-md px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 mt-6">
              <input
                name="free"
                type="checkbox"
                value="1"
                defaultChecked={preferFree}
                className="rounded border-border"
              />
              <span className="text-sm text-text-muted">Prefer free programs</span>
            </label>
            <div className="md:col-span-2 flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent/90"
              >
                Match resources →
              </button>
              <Link
                href="/clinic/community-resources"
                className="text-sm text-text-muted hover:text-text"
              >
                Reset
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {previewMatch && (
        <Card tone="raised" className="mb-6 border-accent/40">
          <CardHeader>
            <CardTitle>Patient handoff preview</CardTitle>
            <CardDescription>
              Paste into a portal note or text. Edit before sending.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm text-text whitespace-pre-wrap leading-relaxed bg-surface-muted rounded-md p-3 border border-border/60">
              {buildPatientHandoff("there", previewMatch)}
            </pre>
            <Link
              href={(() => {
                const params = new URLSearchParams();
                if (conditionsRaw) params.set("conditions", conditionsRaw);
                if (searchParams.city) params.set("city", searchParams.city);
                if (searchParams.state) params.set("state", searchParams.state);
                if (searchParams.region) params.set("region", searchParams.region);
                if (preferFree) params.set("free", "1");
                return `/clinic/community-resources?${params.toString()}`;
              })()}
              className="inline-flex mt-3 text-xs text-text-muted hover:text-text"
            >
              Close preview
            </Link>
          </CardContent>
        </Card>
      )}

      {conditions.length === 0 ? (
        <Card tone="outlined">
          <CardContent className="py-12 text-center">
            <p className="text-text-muted">
              Enter at least one condition above to see ranked community resources.
            </p>
          </CardContent>
        </Card>
      ) : matches.length === 0 ? (
        <Card tone="outlined">
          <CardContent className="py-12 text-center">
            <p className="text-text-muted">
              No matching resources. Try removing the location filter or broadening the
              condition list.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {matches.map((m) => {
            const params = new URLSearchParams();
            if (conditionsRaw) params.set("conditions", conditionsRaw);
            if (searchParams.city) params.set("city", searchParams.city);
            if (searchParams.state) params.set("state", searchParams.state);
            if (searchParams.region) params.set("region", searchParams.region);
            if (preferFree) params.set("free", "1");
            params.set("preview", m.resource.id);
            return (
              <Card key={m.resource.id} tone="raised">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{m.resource.name}</CardTitle>
                      <CardDescription>
                        {m.resource.organization}
                        {m.resource.city ? ` · ${m.resource.city}` : ""}
                        {m.resource.state ? `, ${m.resource.state}` : ""}
                        {m.resource.region ? ` · ${m.resource.region}` : ""}
                      </CardDescription>
                    </div>
                    <span className="text-xs tabular-nums text-text-muted">
                      score {m.score}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-muted mb-3">
                    {m.resource.description}
                  </p>
                  <p className="text-xs text-text-subtle uppercase tracking-wider mb-1">
                    What to expect
                  </p>
                  <p className="text-sm text-text-muted mb-3">
                    {m.resource.whatToExpect}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {m.resource.category.map((c) => (
                      <Badge key={c} tone="neutral">
                        {c.replace("_", " ")}
                      </Badge>
                    ))}
                    <Badge
                      tone={
                        m.resource.feeStructure === "free"
                          ? "success"
                          : m.resource.feeStructure === "sliding_scale"
                            ? "info"
                            : "neutral"
                      }
                    >
                      {m.resource.feeStructure.replace("_", " ")}
                    </Badge>
                    {m.resource.national && <Badge tone="accent">National</Badge>}
                  </div>
                  {m.reasons.length > 0 && (
                    <ul className="text-xs text-text-muted space-y-0.5 mb-3">
                      {m.reasons.map((r, i) => (
                        <li key={i}>· {r}</li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                    {m.resource.phone && <span>📞 {m.resource.phone}</span>}
                    <a
                      href={m.resource.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      🌐 website
                    </a>
                    {m.resource.email && (
                      <a
                        href={`mailto:${m.resource.email}`}
                        className="text-accent hover:underline"
                      >
                        ✉ email
                      </a>
                    )}
                  </div>
                  <Link
                    href={`/clinic/community-resources?${params.toString()}`}
                    className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-text text-surface hover:opacity-90"
                  >
                    Build patient handoff →
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
