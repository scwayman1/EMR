import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricTile } from "@/components/ui/metric-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { VendorStatus } from "@prisma/client";

export const metadata = { title: "Vendors" };

const STATUS_TONE: Record<VendorStatus, "success" | "neutral" | "warning"> = {
  active: "success",
  inactive: "neutral",
  on_hold: "warning",
};

function groupByCategory(vendors: Awaited<ReturnType<typeof fetchVendors>>) {
  const groups = new Map<string, typeof vendors>();
  for (const v of vendors) {
    const bucket = groups.get(v.category) ?? [];
    bucket.push(v);
    groups.set(v.category, bucket);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, items]) => ({ category, items }));
}

async function fetchVendors(organizationId: string) {
  return prisma.vendor.findMany({
    where: { organizationId },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export default async function OpsVendorsPage() {
  const user = await requireUser();
  const orgId = user.organizationId!;

  const [vendors, activeCount, onHoldCount] = await Promise.all([
    fetchVendors(orgId),
    prisma.vendor.count({ where: { organizationId: orgId, status: "active" } }),
    prisma.vendor.count({ where: { organizationId: orgId, status: "on_hold" } }),
  ]);

  const groups = groupByCategory(vendors);

  return (
    <PageShell maxWidth="max-w-[1280px]">
      <PageHeader
        eyebrow="Operations"
        title="Vendor directory"
        description="Suppliers, labs, IT, legal, and every other third-party relationship — in one list."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricTile label="Total vendors" value={vendors.length} />
        <MetricTile label="Active" value={activeCount} />
        <MetricTile
          label="On hold"
          value={onHoldCount}
          hint={onHoldCount > 0 ? "Review required" : "Nothing paused"}
        />
      </div>

      {vendors.length === 0 ? (
        <EmptyState
          title="No vendors on file"
          description="Add suppliers, labs, and service providers here to keep contacts and status in one place."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.category}>
              <h2 className="text-sm font-medium uppercase tracking-wide text-text-subtle mb-3">
                {group.category}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.items.map((vendor) => (
                  <Card key={vendor.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <CardTitle>{vendor.name}</CardTitle>
                        <Badge tone={STATUS_TONE[vendor.status]}>
                          {vendor.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-sm">
                      {vendor.contactName && (
                        <p className="text-text-muted">{vendor.contactName}</p>
                      )}
                      {vendor.contactEmail && (
                        <p className="text-text-muted">
                          <a
                            href={`mailto:${vendor.contactEmail}`}
                            className="text-accent hover:underline"
                          >
                            {vendor.contactEmail}
                          </a>
                        </p>
                      )}
                      {vendor.contactPhone && (
                        <p className="text-text-muted tabular-nums">{vendor.contactPhone}</p>
                      )}
                      {vendor.website && (
                        <p>
                          <a
                            href={vendor.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent hover:underline text-xs"
                          >
                            {vendor.website.replace(/^https?:\/\//, "")}
                          </a>
                        </p>
                      )}
                      {vendor.notes && (
                        <p className="text-xs text-text-subtle pt-2 border-t border-border mt-2">
                          {vendor.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
