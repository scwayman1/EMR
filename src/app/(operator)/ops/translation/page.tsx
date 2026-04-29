import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import {
  SUPPORTED_LANGUAGES,
  StubTranslationProvider,
  translateStatement,
  phrase,
  type SupportedLanguage,
} from "@/lib/billing/translation";

export const metadata = { title: "Statement Translation" };

const SAMPLE_STATEMENT = {
  totals: {
    totalCharges: "$425.00",
    insurancePaid: "$278.40",
    adjustments: "$77.00",
    priorBalance: "$0.00",
    amountDue: "$69.60",
  },
  dueDate: "2026-05-21",
  providerNotes:
    "Your visit on April 12 included an extended discussion of cannabis dosing and a refill of your CBD tincture. Please call if any questions arise.",
  eobSummary:
    "Aetna paid your provider $278.40 of the $425.00 billed. After contractual adjustments, your responsibility is $69.60 — most of that is your annual deductible.",
};

export default async function TranslationPage({
  searchParams,
}: {
  searchParams: { lang?: SupportedLanguage };
}) {
  const target: SupportedLanguage = (searchParams.lang as SupportedLanguage) ?? "es";
  const provider = new StubTranslationProvider();
  const translated = await translateStatement(SAMPLE_STATEMENT, target, provider);

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="Patient access"
        title="In-app translation"
        description="Statement / EOB translation across the platform's supported languages. Static phrases are table-driven (zero LLM cost); free-text routes through the configured provider."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Languages" value={String(SUPPORTED_LANGUAGES.length)} size="md" />
        <StatCard label="RTL supported" value="Arabic" size="md" />
        <StatCard label="Provider" value={provider.name} hint="Configurable" size="md" />
        <StatCard label="Glossary domains" value="3" hint="statement / EOB / general" size="md" />
      </div>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>Supported languages</CardTitle>
          <CardDescription>
            English is the source. Static statement phrases are pre-translated to all 8 launch
            languages; free-text is provider-routed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <a
                key={lang.code}
                href={`/ops/translation?lang=${lang.code}`}
                className={
                  lang.code === target
                    ? "px-3 py-1.5 rounded-md bg-text text-surface text-sm"
                    : "px-3 py-1.5 rounded-md border border-border text-sm hover:bg-surface-muted"
                }
              >
                <span className="font-medium">{lang.nativeName}</span>{" "}
                <span className="text-xs opacity-75">{lang.englishName}</span>
                {lang.rtl && (
                  <Badge tone="info" className="ml-2">
                    RTL
                  </Badge>
                )}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card tone="raised">
        <CardHeader>
          <CardTitle>
            Statement preview ·{" "}
            {SUPPORTED_LANGUAGES.find((l) => l.code === target)?.nativeName}
          </CardTitle>
          <CardDescription>
            Same payload, translated. Money values stay locale-formatted; labels use the static
            phrase table.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border border-border rounded-lg p-6 bg-surface ${translated.rtl ? "text-right" : ""}`}
            dir={translated.rtl ? "rtl" : "ltr"}
          >
            <h2 className="text-2xl font-display mb-2">{translated.labels["statement.title"]}</h2>
            <p className="text-sm text-text-muted mb-6">
              {translated.labels["statement.dueDate"]}: {translated.dueDate}
            </p>

            <dl className="grid grid-cols-2 gap-y-2 text-sm mb-6">
              <dt className="text-text-muted">{translated.labels["statement.totalCharges"]}</dt>
              <dd className="tabular-nums">{translated.totals.totalCharges}</dd>
              <dt className="text-text-muted">{translated.labels["statement.insurancePaid"]}</dt>
              <dd className="tabular-nums">{translated.totals.insurancePaid}</dd>
              <dt className="text-text-muted">{translated.labels["statement.adjustments"]}</dt>
              <dd className="tabular-nums">{translated.totals.adjustments}</dd>
              <dt className="text-text-muted">{translated.labels["statement.priorBalance"]}</dt>
              <dd className="tabular-nums">{translated.totals.priorBalance}</dd>
              <dt className="font-medium">{translated.labels["statement.amountDue"]}</dt>
              <dd className="tabular-nums font-medium">{translated.totals.amountDue}</dd>
            </dl>

            <div className="bg-surface-muted rounded-md p-4 mb-4">
              <div className="text-xs uppercase tracking-wider text-text-subtle mb-1">
                {phrase("eob.summary", target)}
              </div>
              <p className="text-sm">{translated.eobSummary}</p>
            </div>

            <div className="text-sm text-text-muted mb-6">{translated.providerNotes}</div>

            <div className="flex gap-3">
              <button className="px-4 py-2 rounded-md bg-text text-surface text-sm">
                {translated.labels["statement.payNow"]}
              </button>
              <button className="px-4 py-2 rounded-md border border-border text-sm">
                {translated.labels["statement.paymentPlan"]}
              </button>
            </div>

            <p className="text-xs text-text-subtle mt-6">
              {translated.labels["statement.thankYou"]}
            </p>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
