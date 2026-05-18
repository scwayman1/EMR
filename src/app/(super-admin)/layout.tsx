import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { requireSuperAdmin } from "@/lib/auth/super-admin";
import { bootstrapSuperAdminIfAllowlisted } from "@/lib/auth/super-admin-bootstrap";
import { AppShell, type NavSection } from "@/components/shell/AppShell";
import { ROLE_LABELS } from "@/lib/rbac/roles";

export const dynamic = "force-dynamic";

const SUPER_ADMIN_SECTIONS: NavSection[] = [
  {
    pillar: "admin",
    icon: "layout-grid",
    label: "HQ",
    items: [{ label: "Dashboard", href: "/admin/hq" }],
  },
  // EMR-738 — standalone cross-tenant search. The HQ search-bar
  // integration (TODO(EMR-738-hq-integration)) is deferred to avoid
  // conflict with PR #344.
  {
    pillar: "admin",
    icon: "layout-grid",
    label: "Search",
    items: [{ label: "Search", href: "/admin/search" }],
  },
  // EMR-747 — ControllerAuditLog viewer. Placed between Search and
  // Onboarding so the cross-tenant ops triad (search → audit →
  // onboarding) reads top-to-bottom in the nav.
  {
    pillar: "admin",
    icon: "layout-grid",
    label: "Audit Log",
    items: [{ label: "Audit Log", href: "/admin/audit" }],
  },
  {
    pillar: "onboarding",
    icon: "clipboard-check",
    label: "Onboarding",
    items: [{ label: "Onboarding", href: "/onboarding" }],
  },
  {
    pillar: "practices",
    icon: "building",
    label: "Practices",
    items: [{ label: "Practices", href: "/practices" }],
  },
  {
    pillar: "templates",
    icon: "layout-grid",
    label: "Templates",
    items: [{ label: "Templates", href: "/templates" }],
  },
  {
    pillar: "admin",
    icon: "settings",
    label: "Admin",
    items: [
      { label: "Console", href: "/admin/console" },
      { label: "Bootstrap allowlist", href: "/admin/bootstrap" },
    ],
  },
];

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await requireUser();
    await bootstrapSuperAdminIfAllowlisted(user);
    await requireSuperAdmin();
  } catch (err) {
    const code = err instanceof Error ? err.message : "FORBIDDEN";
    if (code === "UNAUTHORIZED") redirect("/sign-in");
    redirect("/");
  }

  return (
    <AppShell
      user={user}
      activeRole="super_admin"
      sections={SUPER_ADMIN_SECTIONS}
      roleLabel={ROLE_LABELS.super_admin}
      showNavPrefs={false}
    >
      {children}
    </AppShell>
  );
}
