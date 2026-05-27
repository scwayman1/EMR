import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { lex } from "@/lib/lexicon";

export const metadata = { title: "CME Program · Operator" };

const KPIS = [
  { label: "Active providers", value: "84", hint: "Earned credit in last 90d" },
  { label: "Credits accrued (Q)", value: "412", hint: "Credit hours" },
  { label: "Credits submitted (Q)", value: "276" },
  { label: "Boards integrated", value: "4", hint: "AMA · AOA · ACCME · STATE" },
];

const TOP_TOPICS = [
  { label: "Endocannabinoid system & PTSD", credits: 88 },
  { label: "CBD/THC ratios in pediatric epilepsy", credits: 72 },
  { label: "Opioid-sparing in chronic pain", credits: 64 },
  { label: "Drug-drug interactions: warfarin + CBD", credits: 41 },
  { label: "Cancer cachexia evidence map", credits: 38 },
];

const BOARDS = [
  { label: "AMA", state: "Connected", tone: "success" as const },
  { label: "AOA", state: "Connected", tone: "success" as const },
  { label: "ACCME", state: "Connected", tone: "success" as const },
  { label: "State boards", state: "12 of 50", tone: "warning" as const },
];

export default async function CmeProgramPage() {
  await requireUser();
  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow={lex("program.cme")}
        title="Provider CME program"
        description="Provider research velocity, credit accrual, and board-submission posture."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPIS.map((k) => (
          <Card key={k.label}>
            <CardContent className="py-4">
              <p className="text-[11px] uppercase tracking-wider text-text-subtle">{k.label}</p>
              <p className="font-display text-2xl text-text mt-1 tabular-nums">{k.value}</p>
              {k.hint && <p className="text-[11px] text-text-subtle mt-1">{k.hint}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="py-6">
          <p className="text-xs uppercase tracking-wider text-text-subtle mb-3">Top research topics (Q)</p>
          <ul className="space-y-2">
            {TOP_TOPICS.map((t) => {
              const max = Math.max(...TOP_TOPICS.map((x) => x.credits));
              const pct = (t.credits / max) * 100;
              return (
                <li key={t.label} className="flex items-center gap-3">
                  <span className="text-sm text-text w-72 shrink-0">{t.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div className="h-full bg-emerald-700" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-text-subtle tabular-nums w-20 text-right">{t.credits}</span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="py-6">
          <p className="text-xs uppercase tracking-wider text-text-subtle mb-3">Board integrations</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {BOARDS.map((b) => (
              <div key={b.label} className="flex items-center justify-between bg-surface-muted/40 rounded-md px-3 py-2">
                <span className="text-sm text-text">{b.label}</span>
                <Badge tone={b.tone}>{b.state}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
