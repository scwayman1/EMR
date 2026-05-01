import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/ornament";
import { SITE_URL } from "@/lib/seo";
import {
  summarizeFund,
  verifyChain,
  centsToDollarsCompact,
  type LedgerSource,
} from "@/lib/domain/charitable-fund";
import { buildDemoFundLedger } from "@/lib/domain/charitable-fund-demo";

export const metadata: Metadata = {
  title: "Charitable Fund — Leafjourney",
  description:
    "The Leafjourney Charitable Fund's public, append-only ledger. Every inflow and outflow is hash-chained, signed, and publicly verifiable.",
  alternates: { canonical: `${SITE_URL}/advocacy/fund` },
  robots: { index: true, follow: true },
};

const SOURCE_LABEL: Record<LedgerSource, string> = {
  revenue_share: "Revenue share",
  volunteer_offset: "Volunteer offset",
  voluntary_donation: "Voluntary donation",
  founders_pledge: "Founders' pledge",
  matching_grant: "Matching grant",
};

export default function CharitableFundPage() {
  const chain = buildDemoFundLedger();
  const verification = verifyChain(chain);
  const summary = summarizeFund(chain);

  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader />

      <main className="max-w-[1320px] mx-auto px-6 lg:px-12 pt-16 pb-24">
        <div className="text-center max-w-3xl mx-auto">
          <Eyebrow className="justify-center mb-4">Public ledger</Eyebrow>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight text-text">
            Leafjourney Charitable Fund
          </h1>
          <p className="text-lg text-text-muted mt-5 leading-relaxed">
            We pledged to be the receipt, not the claim. Every inflow and every distribution
            from the fund is recorded here in an append-only, hash-chained ledger. No login
            required to audit. Tampering with any entry breaks every entry that follows.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
          <SummaryTile label="Total inflows" value={centsToDollarsCompact(summary.totalInflowsCents)} />
          <SummaryTile label="Total distributions" value={centsToDollarsCompact(summary.totalOutflowsCents)} />
          <SummaryTile label="Current balance" value={centsToDollarsCompact(summary.balanceCents)} />
          <SummaryTile label="Ledger entries" value={summary.entryCount.toString()} />
        </div>

        <Card className="mt-6">
          <CardContent className="py-5 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wider text-text-subtle">Chain integrity</p>
              <p className="text-sm text-text mt-1">
                {verification.ok
                  ? "All entries hash-verified. Chain intact."
                  : `Tamper detected at entry #${verification.brokenAt + 1}. Forensics required.`}
              </p>
            </div>
            <Badge tone={verification.ok ? "success" : "danger"}>
              {verification.ok ? "Verified" : "BROKEN"}
            </Badge>
          </CardContent>
        </Card>

        <h2 className="font-display text-2xl text-text mt-12 mb-4">Ledger</h2>
        <Card>
          <CardContent className="py-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-subtle text-[11px] uppercase tracking-wider">
                  <th className="py-3 font-medium">#</th>
                  <th className="py-3 font-medium">Date</th>
                  <th className="py-3 font-medium">Direction</th>
                  <th className="py-3 font-medium">Source / Recipient</th>
                  <th className="py-3 font-medium">Memo</th>
                  <th className="py-3 font-medium text-right">Amount</th>
                  <th className="py-3 font-medium">Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {chain.map((e) => (
                  <tr key={e.id}>
                    <td className="py-3 align-top text-text-subtle tabular-nums">{e.index + 1}</td>
                    <td className="py-3 align-top text-text-muted tabular-nums">
                      {new Date(e.occurredAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 align-top">
                      <Badge tone={e.direction === "inflow" ? "success" : "accent"}>{e.direction}</Badge>
                    </td>
                    <td className="py-3 align-top text-text">
                      {e.direction === "inflow"
                        ? e.source
                          ? SOURCE_LABEL[e.source]
                          : "—"
                        : (e.destinationCharityName ?? "—")}
                    </td>
                    <td className="py-3 align-top text-text-muted">{e.memo}</td>
                    <td
                      className={`py-3 align-top text-right tabular-nums ${
                        e.direction === "inflow" ? "text-emerald-700" : "text-text"
                      }`}
                    >
                      {e.direction === "inflow" ? "+" : "−"}
                      {centsToDollarsCompact(e.amountCents)}
                    </td>
                    <td className="py-3 align-top">
                      <code className="text-[10px] text-text-subtle break-all">{e.hash.slice(0, 16)}…</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <h2 className="font-display text-2xl text-text mt-12 mb-4">By recipient</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {summary.topRecipients.map((r) => (
            <Card key={r.charityId}>
              <CardContent className="py-4 flex items-center justify-between">
                <span className="text-sm text-text">{r.charityName}</span>
                <span className="text-sm text-text-muted tabular-nums">
                  {centsToDollarsCompact(r.totalCents)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-xs text-text-subtle mt-12 max-w-3xl">
          The ledger is reviewed daily by an AI compliance framework that flags any anomaly.
          An annual State of the Fund report is auto-generated and signed by the co-founders.
          Distributions follow Article VII §5: no organization with board overlap to
          Leafjourney leadership is eligible to receive funds.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-[11px] uppercase tracking-wider text-text-subtle">{label}</p>
        <p className="font-display text-2xl text-text mt-1 tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
