// @ts-nocheck
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Plus, Shield, User } from "lucide-react";
import { notFound } from "next/navigation";

export const metadata = { title: "Team Members" };

export default async function MembersPage({ params }: { params: { orgId: string } }) {
  const user = await requireRole(["admin", "provider"]);

  const organization = await prisma.organization.findUnique({
    where: { id: params.orgId },
    include: {
      providers: true,
      // In a real schema we might have an OrganizationMember bridging table.
      // For V1, we list the providers assigned to this org.
    }
  });

  if (!organization) {
    notFound();
  }

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
              {organization.providers.map((provider) => (
                <tr key={provider.id} className="hover:bg-[var(--surface-muted)]/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center font-medium">
                        {provider.firstName.charAt(0)}{provider.lastName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-text">
                          Dr. {provider.firstName} {provider.lastName}
                        </div>
                        <div className="text-text-muted text-xs">
                          {provider.specialty || "Provider"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-text-muted">
                      {/* For demo purposes, we randomly assign roles */}
                      {provider.id.endsWith("a") ? (
                        <><Shield className="w-3.5 h-3.5" /> Admin</>
                      ) : (
                        <><User className="w-3.5 h-3.5" /> Clinician</>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge tone="success" className="text-[10px]">Active</Badge>
                  </td>
                  <td className="px-6 py-4 text-text-muted">
                    Just now
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted">
                      <MoreHorizontal className="w-4 h-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
