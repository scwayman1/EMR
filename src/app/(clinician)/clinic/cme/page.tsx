import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { summarizeLedger, type CmeBoard } from "@/lib/domain/provider-cme";
import { buildDemoCmeLedger } from "@/lib/domain/provider-cme-demo";
import {
  BOARD_REQUIREMENTS,
  buildCmePageSnapshot,
  generateCmeCertificate,
} from "@/lib/education/cme";

export const metadata = { title: "CME Credits" };

const PRIMARY_BOARDS: CmeBoard[] = ["AMA", "ACCME", "STATE"];

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatHours(h: number): string {
  return `${h.toFixed(2)}`;
}

export default async function CmeCreditsPage() {
  const user = await requireRole("clinician");
  const { sessions, credits } = buildDemoCmeLedger(user.id);
  const ledger = summarizeLedger(credits);
  const cycleStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const snapshot = buildCmePageSnapshot({
    ledger,
    credits,
    providerId: user.id,
    boards: PRIMARY_BOARDS,
    cycleStart,
  });
  const cert = generateCmeCertificate({
    providerId: user.id,
    providerName: `${user.firstName} ${user.lastName}`.trim() || user.email,
    credits,
    board: "AMA",
    periodStart: cycleStart.toISOString(),
    periodEnd: new Date().toISOString(),
  });

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow="CME"
        title="Your CME credits"
        description="Every research session you log inside Leafjourney accrues toward AMA PRA Category 1 credit. Track requirements, generate certificates, and keep an eye on cycle deadlines."
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Total credit</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">{formatHours(ledger.totalCreditHours)} hrs</div>
          <div className="mt-1 text-xs text-zinc-500">{ledger.pending.length} pending attestation</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Year-to-date</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">{formatHours(ledger.ytdCreditHours)} hrs</div>
          <div className="mt-1 text-xs text-zinc-500">{sessions.length} research sessions logged</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Submitted</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">{ledger.submitted.length}</div>
          <div className="mt-1 text-xs text-zinc-500">credits forwarded to boards</div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Board requirements</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {snapshot.requirements.map((r) => {
            const def = BOARD_REQUIREMENTS[r.board];
            return (
              <article key={r.board} className="rounded-2xl border border-zinc-200 bg-white p-5">
                <header className="flex items-center justify-between">
                  <h3 className="font-semibold tracking-tight">{r.board}</h3>
                  <span
                    className={
                      r.pctComplete >= 100
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                        : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                    }
                  >
                    {r.pctComplete >= 100 ? "Complete" : `${r.hoursRemaining.toFixed(1)} hrs to go`}
                  </span>
                </header>
                <p className="mt-2 text-xs text-zinc-600">{def.description}</p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full bg-emerald-600 transition-[width]"
                    style={{ width: `${Math.min(100, r.pctComplete)}%` }}
                    aria-hidden
                  />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-zinc-500">Earned</dt>
                    <dd className="font-medium">{r.earnedCreditHours.toFixed(2)} hrs</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Cycle ends</dt>
                    <dd className="font-medium">{r.cycleEnd.slice(0, 10)}</dd>
                  </div>
                </dl>
                {r.topicGaps.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-xs">
                    {r.topicGaps.map((tg) => (
                      <li key={tg.topic} className={tg.gap === 0 ? "text-emerald-700" : "text-amber-700"}>
                        {tg.topic.replace(/_/g, " ")}: {tg.earned.toFixed(1)}/{tg.required} hrs
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      {snapshot.upcomingReminders.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Upcoming reminders</h2>
          <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
            {snapshot.upcomingReminders.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">{r.message}</div>
                  <div className="text-xs text-zinc-500">{r.fireAt.slice(0, 10)}</div>
                </div>
                <span
                  className={
                    r.urgency === "critical"
                      ? "rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800"
                      : r.urgency === "high"
                      ? "rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800"
                      : "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
                  }
                >
                  {r.urgency}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-semibold tracking-tight">Annual certificate (AMA)</h2>
        <p className="mt-1 text-sm text-zinc-600">{cert.attestationStatement}</p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
          <div>
            <dt className="text-zinc-500">Total hours</dt>
            <dd className="font-medium">{cert.totalCreditHours.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Topics</dt>
            <dd className="font-medium">{cert.topics.length}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Issued</dt>
            <dd className="font-medium">{cert.issuedAt.slice(0, 10)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Verify hash</dt>
            <dd className="truncate font-mono text-[10px]">{cert.attestationHash}</dd>
          </div>
        </dl>
      </section>

      <p className="mt-6 text-xs text-zinc-400">
        Note: this view is read-only at /clinic/cme. Provider attestation and submission live at
        /clinic/cme-ledger. Certificate value: {formatCents(0)} (no fee).
      </p>
    </PageShell>
  );
}
