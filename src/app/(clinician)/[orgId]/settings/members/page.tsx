import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Plus, Shield, User as UserIcon } from "lucide-react";
import { notFound, redirect } from "next/navigation";

export const metadata = { title: "Team Members" };

const PROVIDER_LIST_CAP = 200;

// Role-display gate. Any signed-in clinician or practice admin may view
// the roster; mutation handlers (invite/remove) gate on practice_admin.
const VIEWER_ROLES = ["clinician", "practice_admin", "super_admin"] as const;

function initials(firstName: string | null, lastName: string | null): string {
  const a = (firstName ?? "").trim().charAt(0).toUpperCase();
  const b = (lastName ?? "").trim().charAt(0).toUpperCase();
  return a + b || "?";
}

export default async function MembersPage({
  params,
}: {
  params: { orgId: string };
}) {
  // EMR-?? bugfix: the previous handler called requireRole(["admin",
  // "provider"]) — both wrong: requireRole takes a single Role enum
  // value, and "admin"/"provider" aren't members of the Role enum
  // (it's clinician / practice_admin / super_admin / etc). With
  // @ts-nocheck on top, the broken call shipped; every request to
  // this page threw FORBIDDEN at the role gate. Replaced with the
  // explicit "any of these roles" check below.
  const user = await requireUser();
  if (!user.roles.some((r) => (VIEWER_ROLES as readonly string[]).includes(r))) {
    redirect("/clinic");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: params.orgId },
    include: {
      providers: {
        where: { active: true },
        orderBy: { createdAt: "asc" },
        take: PROVIDER_LIST_CAP,
        include: {
          // Provider does not carry firstName/lastName — those live on
          // the related User. The previous version accessed
          // provider.firstName.charAt(0) which threw at runtime when
          // @ts-nocheck wasn't preventing the type error.
          user: {
            select: { firstName: true, lastName: true, lastLoginAt: true },
          },
        },
      },
    },
  });

  if (!organization) {
    notFound();
  }

  const providers = organization.providers;

  return (
    <PageShell maxWidth="max-w-[1000px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <PageHeader
          eyebrow="Settings"
          title="Team Members"
          description="Manage clinical and administrative staff access."
        />
        <Button className="shrink-0 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Invite Member
        </Button>
      </div>

      <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface-muted)] border-b border-[var(--border)] text-text-subtle">
              <tr>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Name</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Role</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Last Active</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {providers.map((provider) => {
                const firstName = provider.user.firstName ?? "";
                const lastName = provider.user.lastName ?? "";
                const specialtyLabel =
                  provider.specialties[0] ?? provider.title ?? "Provider";
                // TODO: surface the provider's actual platform role by
                // joining Membership(role) for this user × this org.
                // Showing "Clinician" universally is honest given today's
                // schema doesn't stash a per-provider admin flag — better
                // than the fake `id.endsWith("a")` heuristic the prior
                // version used.
                const isAdmin = false;
                const lastLoginAt = provider.user.lastLoginAt
                  ? provider.user.lastLoginAt.toLocaleString()
                  : "—";
                return (
                  <tr
                    key={provider.id}
                    className="hover:bg-[var(--surface-muted)]/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center font-medium">
                          {initials(firstName, lastName)}
                        </div>
                        <div>
                          <div className="font-medium text-text">
                            Dr. {firstName} {lastName}
                          </div>
                          <div className="text-text-muted text-xs">
                            {specialtyLabel}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-text-muted">
                        {isAdmin ? (
                          <>
                            <Shield className="w-3.5 h-3.5" /> Admin
                          </>
                        ) : (
                          <>
                            <UserIcon className="w-3.5 h-3.5" /> Clinician
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge tone="success" className="text-[10px]">
                        Active
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-text-muted">{lastLoginAt}</td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-text-muted"
                        aria-label="Actions"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
