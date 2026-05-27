import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/ornament";
import { listOpenDeadLetters } from "@/lib/billing/clearinghouse/dead-letter";
import { resolveAction } from "./actions";

export const metadata = { title: "Clearinghouse dead-letter — admin" };

const TONE_BY_CATEGORY: Record<string, "danger" | "warning" | "neutral"> = {
  auth: "danger",
  permanent_rejection: "danger",
  malformed_response: "warning",
  rate_limit_exhausted: "warning",
  network: "neutral",
  timeout: "neutral",
};

export default async function DeadLetterPage() {
  const user = await requireUser();
  if (!user.organizationId) return <PageShell><p>No org selected.</p></PageShell>;

  const rows = await listOpenDeadLetters(user.organizationId);

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Billing → admin"
        title="Clearinghouse dead-letter queue"
        description="Submissions that hit permanent failures. Fix the underlying issue (gateway creds, payer enrollment, claim data) and resolve to clear the row."
      />

      <Card>
        <CardHeader>
          <Eyebrow>Open</Eyebrow>
          <CardTitle>{rows.length} unresolved</CardTitle>
          <CardDescription>Sorted by most-recent failure.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-text-muted">Queue is empty. Nice work.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted border-b">
                    <th className="py-2 pr-4">Claim</th>
                    <th className="py-2 pr-4">Gateway</th>
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4">Attempts</th>
                    <th className="py-2 pr-4">Last failure</th>
                    <th className="py-2 pr-4">Error</th>
                    <th className="py-2 pr-4 text-right">Resolve</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-b-0 align-top">
                      <td className="py-2 pr-4 font-mono text-xs">{r.claimId ?? "—"}</td>
                      <td className="py-2 pr-4">{r.gatewayName}</td>
                      <td className="py-2 pr-4">
                        <Badge tone={TONE_BY_CATEGORY[r.failureCategory] ?? "neutral"}>{r.failureCategory}</Badge>
                      </td>
                      <td className="py-2 pr-4">{r.attemptCount}</td>
                      <td className="py-2 pr-4">{r.lastFailedAt.toISOString().slice(0, 19).replace("T", " ")}</td>
                      <td className="py-2 pr-4 max-w-md break-words">{r.errorMessage}</td>
                      <td className="py-2 pr-4 text-right">
                        <form action={resolveAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <input
                            name="note"
                            placeholder="Resolution note"
                            className="rounded border border-border bg-transparent px-2 py-1 text-xs"
                          />
                          <button
                            type="submit"
                            className="ml-2 rounded-md border border-border bg-surface-raised px-2 py-1 text-xs hover:bg-surface-elevated"
                          >
                            Resolve
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
