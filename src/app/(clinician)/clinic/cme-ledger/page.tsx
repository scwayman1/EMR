import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { lex } from "@/lib/lexicon";
import { summarizeLedger } from "@/lib/domain/provider-cme";
import { buildDemoCmeLedger } from "@/lib/domain/provider-cme-demo";
import { CmeLedgerView } from "./ledger-view";

export const metadata = { title: "CME Ledger" };

export default async function CmeLedgerPage() {
  const user = await requireRole("clinician");
  const { sessions, credits } = buildDemoCmeLedger(user.id);
  const snapshot = summarizeLedger(credits);

  return (
    <PageShell maxWidth="max-w-[1200px]">
      <PageHeader
        eyebrow={lex("program.cme")}
        title="Your CME ledger"
        description="Every minute you spend researching cannabis medicine inside Leafjourney accrues toward your CME credits. Attest, submit to your board, and download an annual summary."
      />
      <CmeLedgerView sessions={sessions} credits={credits} snapshot={snapshot} />
    </PageShell>
  );
}
