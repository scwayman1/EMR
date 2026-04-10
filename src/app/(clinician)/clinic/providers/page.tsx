import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Providers" };

export default async function ProvidersPage() {
  const user = await requireUser();

  const providers = await prisma.provider.findMany({
    where: {
      organizationId: user.organizationId!,
      active: true,
    },
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (providers.length === 0) {
    return (
      <PageShell>
        <PageHeader
          eyebrow="Providers"
          title="Provider directory"
          description="View and contact providers in your organization."
        />
        <EmptyState
          title="No providers found"
          description="There are no active providers in your organization yet."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Providers"
        title="Provider directory"
        description="View and contact providers in your organization."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => (
          <Card key={provider.id} className="card-hover">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Avatar
                  firstName={provider.user.firstName}
                  lastName={provider.user.lastName}
                  size="lg"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-medium text-text tracking-tight truncate">
                    {provider.user.firstName} {provider.user.lastName}
                  </h3>
                  {provider.title && (
                    <p className="text-sm text-text-muted mt-0.5 truncate">
                      {provider.title}
                    </p>
                  )}
                </div>
              </div>

              {provider.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {provider.specialties.map((specialty) => (
                    <Badge key={specialty} tone="accent">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              )}

              {provider.bio && (
                <p className="text-xs text-text-subtle mt-3 line-clamp-2 leading-relaxed">
                  {provider.bio}
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-border/60">
                <button
                  disabled
                  className="w-full text-sm font-medium text-accent/60 py-2 rounded-md border border-border/60 bg-surface-muted cursor-not-allowed"
                >
                  Send message — coming soon
                </button>
                <p className="text-[11px] text-text-subtle text-center mt-1.5">
                  Secure provider messaging is being built
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
