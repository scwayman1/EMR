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
                <a
                  href="/clinic/providers/messages"
                  className="flex items-center justify-center gap-2 w-full text-sm font-medium text-accent py-2 rounded-md border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-accent">
                    <path d="M12 1H2C1.45 1 1 1.45 1 2V9.5C1 10.05 1.45 10.5 2 10.5H4L7 13L10 10.5H12C12.55 10.5 13 10.05 13 9.5V2C13 1.45 12.55 1 12 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                  Secure message
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
