import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/ornament";
import { isValidNpi } from "@/lib/billing/identifiers";
import { saveOrgIdentifiersAction, saveProviderIdentifierAction } from "./actions";

export const metadata = { title: "Billing identifiers — admin" };

// EMR-220 admin page — Settings → Practice + Settings → Providers in one
// place because they map to a single "billing identifiers" mental model.
// All saves are validated server-side (NPI Luhn, EIN format).

export default async function IdentifiersPage() {
  const user = await requireUser();
  if (!user.organizationId) return <PageShell><p>No org selected.</p></PageShell>;

  const [org, providers] = await Promise.all([
    prisma.organization.findUnique({ where: { id: user.organizationId } }),
    prisma.provider.findMany({
      where: { organizationId: user.organizationId, active: true },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!org) return <PageShell><p>Organization not found.</p></PageShell>;

  const billingAddress = (org.billingAddress as Record<string, unknown> | null) ?? null;

  return (
    <PageShell maxWidth="max-w-[1320px]">
      <PageHeader
        eyebrow="Billing → admin"
        title="Production billing identifiers"
        description="NPIs, tax ID, and pay-to address. Required before any production claim leaves the building."
      />

      <Card className="mb-8">
        <CardHeader>
          <Eyebrow>Organization (Settings → Practice)</Eyebrow>
          <CardTitle>Billing entity</CardTitle>
          <CardDescription>
            These values populate Loop 2010AA / 2010AB on every 837P. Tax ID is encrypted at rest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveOrgIdentifiersAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium">Billing NPI (10-digit)</span>
              <input
                name="billingNpi"
                defaultValue={org.billingNpi ?? ""}
                placeholder="1234567893"
                className="mt-1 w-full rounded border border-border bg-transparent px-2 py-1 font-mono"
              />
              {org.billingNpi && (
                <span className="text-xs">
                  {isValidNpi(org.billingNpi) ? (
                    <Badge tone="success">Luhn valid</Badge>
                  ) : (
                    <Badge tone="danger">Invalid checksum</Badge>
                  )}
                </span>
              )}
            </label>
            <label className="block">
              <span className="text-sm font-medium">Tax ID / EIN</span>
              <input
                name="taxId"
                placeholder="12-3456789 (re-enter to update)"
                className="mt-1 w-full rounded border border-border bg-transparent px-2 py-1 font-mono"
              />
              <span className="text-xs text-text-muted">
                {org.taxId ? "Currently: ••••••• (encrypted)" : "Not yet set"}
              </span>
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-medium">Billing address line 1</span>
              <input
                name="line1"
                defaultValue={typeof billingAddress?.line1 === "string" ? billingAddress.line1 : ""}
                className="mt-1 w-full rounded border border-border bg-transparent px-2 py-1"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">City</span>
              <input
                name="city"
                defaultValue={typeof billingAddress?.city === "string" ? billingAddress.city : ""}
                className="mt-1 w-full rounded border border-border bg-transparent px-2 py-1"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">State (2-letter)</span>
              <input
                name="state"
                defaultValue={typeof billingAddress?.state === "string" ? billingAddress.state : ""}
                maxLength={2}
                className="mt-1 w-full rounded border border-border bg-transparent px-2 py-1 uppercase"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Postal code</span>
              <input
                name="postalCode"
                defaultValue={typeof billingAddress?.postalCode === "string" ? billingAddress.postalCode : ""}
                className="mt-1 w-full rounded border border-border bg-transparent px-2 py-1"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm font-medium hover:bg-surface-elevated"
              >
                Save billing identifiers
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Eyebrow>Providers (Settings → Providers)</Eyebrow>
          <CardTitle>Rendering provider NPIs</CardTitle>
          <CardDescription>Each rendering provider needs a type-1 NPI plus their taxonomy code.</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted border-b">
                <th className="py-2 pr-4">Provider</th>
                <th className="py-2 pr-4">NPI</th>
                <th className="py-2 pr-4">Taxonomy</th>
                <th className="py-2 pr-4 text-right">Save</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id} className="border-b last:border-b-0 align-top">
                  <td className="py-2 pr-4 font-medium">
                    {p.user.firstName} {p.user.lastName} {p.title ? <span className="text-text-muted">({p.title})</span> : null}
                  </td>
                  <td className="py-2 pr-4">
                    <form id={`f-${p.id}`} action={saveProviderIdentifierAction} className="contents">
                      <input type="hidden" name="providerId" value={p.id} />
                      <input
                        name="npi"
                        defaultValue={p.npi ?? ""}
                        placeholder="1234567893"
                        className="rounded border border-border bg-transparent px-2 py-1 font-mono"
                      />
                      {p.npi && (
                        <span className="ml-2 text-xs">
                          {isValidNpi(p.npi) ? <Badge tone="success">valid</Badge> : <Badge tone="danger">invalid</Badge>}
                        </span>
                      )}
                    </form>
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      form={`f-${p.id}`}
                      name="taxonomyCode"
                      defaultValue={p.taxonomyCode ?? ""}
                      placeholder="207RI0008X"
                      className="rounded border border-border bg-transparent px-2 py-1 font-mono"
                    />
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <button
                      form={`f-${p.id}`}
                      type="submit"
                      className="rounded-md border border-border bg-surface-raised px-2 py-1 text-xs hover:bg-surface-elevated"
                    >
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
