import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RX_CATALOG,
  checkCannabisInteractions,
  recommendForIndication,
  type EvidenceLevel,
  type RxClass,
  type RxEntry,
} from "@/lib/platform/fda-rx";

export const metadata = { title: "FDA Rx + Cannabis bank" };

const CLASS_TONE: Record<RxClass, "accent" | "highlight" | "info"> = {
  rx: "info",
  cannabis: "highlight",
  supplement: "accent",
};

const CLASS_LABEL: Record<RxClass, string> = {
  rx: "Rx",
  cannabis: "Cannabis",
  supplement: "Supplement",
};

const EVIDENCE_TONE: Record<
  EvidenceLevel,
  "success" | "highlight" | "warning" | "neutral"
> = {
  strong: "success",
  moderate: "highlight",
  limited: "warning",
  anecdotal: "neutral",
};

function groupByClass(entries: RxEntry[]): Record<RxClass, RxEntry[]> {
  const out: Record<RxClass, RxEntry[]> = {
    rx: [],
    cannabis: [],
    supplement: [],
  };
  for (const e of entries) out[e.class].push(e);
  return out;
}

export default async function FdaRxPage() {
  await requireUser();

  const grouped = groupByClass(RX_CATALOG);
  const classOrder: RxClass[] = ["rx", "cannabis", "supplement"];

  const insomniaPicks = recommendForIndication("insomnia", { limit: 4 });
  const anxietyPicks = recommendForIndication("anxiety", { limit: 4 });
  const painPicks = recommendForIndication("pain", { limit: 4 });

  // Demo interaction check — gabapentin + tramadol patient adding THC tincture.
  const demoFindings = checkCannabisInteractions(
    ["rx-gabapentin", "rx-tramadol"],
    "THC Tincture (sublingual)",
  );

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Platform · EMR-154"
        title="FDA Rx + Cannabis + Supplement bank"
        description="Curated prescribing + recommendation bank backing the prescribing module, the cannabis Combo Wheel, and the drug-cannabis interaction checker. Structure-and-function framing on supplements — never disease claims."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        {classOrder.map((c) => (
          <Card key={c} tone="raised">
            <CardContent className="pt-6">
              <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                {CLASS_LABEL[c]}
              </p>
              <p className="font-display text-3xl mt-2 tabular-nums">
                {grouped[c].length}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {c === "rx"
                  ? "FDA-approved with RxNorm + NDC."
                  : c === "cannabis"
                    ? "Cannabinoid + format primitives."
                    : "Evidence-rated supplements."}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Recommendation rails ─────────────────────────── */}
      <section className="mb-10">
        <h2 className="font-display text-xl text-text mb-4">
          Recommend for indication
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Insomnia", picks: insomniaPicks },
            { label: "Anxiety", picks: anxietyPicks },
            { label: "Pain", picks: painPicks },
          ].map((row) => (
            <Card key={row.label}>
              <CardHeader>
                <CardTitle>{row.label}</CardTitle>
                <CardDescription>
                  Top {row.picks.length} ranked by cannabis evidence level.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {row.picks.map((p) => (
                    <li
                      key={p.id}
                      className="border-t border-border/60 pt-3 first:border-t-0 first:pt-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{p.name}</p>
                        <Badge tone={EVIDENCE_TONE[p.cannabisEvidence]}>
                          {p.cannabisEvidence}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-text-muted mt-1">
                        {p.commonAdultDose}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Interaction demo ─────────────────────────────── */}
      <Card className="mb-10">
        <CardHeader>
          <CardTitle>Cannabis interaction check — sample</CardTitle>
          <CardDescription>
            Patient on gabapentin + tramadol adding sublingual THC tincture.
            Surfaced live on the Rx form and the Combo Wheel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {demoFindings.length === 0 ? (
            <Badge tone="success">No findings</Badge>
          ) : (
            <ul className="space-y-3">
              {demoFindings.map((f, i) => (
                <li
                  key={`${f.rxId}-${i}`}
                  className="border-t border-border/60 pt-3 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {f.rxName} ↔ {f.cannabisItem}
                      </p>
                      <p className="text-[11px] text-text-muted mt-1">
                        {f.detail}
                      </p>
                    </div>
                    <Badge
                      tone={
                        f.severity === "major"
                          ? "danger"
                          : f.severity === "moderate"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {f.severity}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Catalog ───────────────────────────────────────── */}
      {classOrder.map((c) => (
        <section key={c} className="mb-10">
          <h2 className="font-display text-xl text-text mb-4">
            {CLASS_LABEL[c]} catalog
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {grouped[c].map((entry) => (
              <Card key={entry.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{entry.name}</CardTitle>
                      <CardDescription>
                        {entry.therapeuticClass}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={CLASS_TONE[entry.class]}>
                        {CLASS_LABEL[entry.class]}
                      </Badge>
                      {entry.controlled && (
                        <Badge tone="warning">CIV-{entry.controlled}</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-muted leading-relaxed">
                    {entry.patientExplainer}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
                    <div className="col-span-2">
                      <p className="uppercase tracking-[0.14em] text-text-subtle mb-1">
                        Indications
                      </p>
                      <p className="text-text-muted">
                        {entry.indications.join(", ")}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="uppercase tracking-[0.14em] text-text-subtle mb-1">
                        Dose · {entry.route}
                      </p>
                      <p className="font-mono text-text-muted">
                        {entry.commonAdultDose}
                      </p>
                    </div>
                    {entry.contraindications.length > 0 && (
                      <div className="col-span-2">
                        <p className="uppercase tracking-[0.14em] text-text-subtle mb-1">
                          Contraindications
                        </p>
                        <p className="text-text-muted">
                          {entry.contraindications.join(", ")}
                        </p>
                      </div>
                    )}
                    {entry.interactsWith.length > 0 && (
                      <div className="col-span-2">
                        <p className="uppercase tracking-[0.14em] text-text-subtle mb-1">
                          Interacts with
                        </p>
                        <p className="text-text-muted">
                          {entry.interactsWith.join(", ")}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="uppercase tracking-[0.14em] text-text-subtle mb-1">
                        Cannabis evidence
                      </p>
                      <Badge tone={EVIDENCE_TONE[entry.cannabisEvidence]}>
                        {entry.cannabisEvidence}
                      </Badge>
                    </div>
                    {(entry.rxnormCode || entry.ndc) && (
                      <div>
                        <p className="uppercase tracking-[0.14em] text-text-subtle mb-1">
                          Codes
                        </p>
                        <p className="font-mono text-text-muted">
                          {entry.rxnormCode ? `RxNorm ${entry.rxnormCode}` : ""}
                          {entry.rxnormCode && entry.ndc ? " · " : ""}
                          {entry.ndc ? `NDC ${entry.ndc}` : ""}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}

      <p className="text-[11px] text-text-subtle italic text-center mt-6">
        Supplement entries describe structure/function only. Not intended to
        diagnose, treat, cure, or prevent any disease.
      </p>
    </PageShell>
  );
}
