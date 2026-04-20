import * as React from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Wordmark } from "@/components/ui/logo";
import { logoutAction } from "@/lib/auth/actions";
import type { AuthedUser } from "@/lib/auth/session";
import type { Role } from "@prisma/client";
import { ROLE_HOME } from "@/lib/rbac/roles";
import { MobileNav } from "./MobileNav";
import { NavSections } from "./NavSections";
import type { NavItem, NavSection } from "./nav-sections";

// Re-export so existing consumers (each layout) can keep importing the
// NavItem / NavSection types from this module.
export type { NavItem, NavSection } from "./nav-sections";
export type { BadgeSeverity, NavBadge } from "@/lib/domain/nav-badges";

export interface AppShellProps {
  user: AuthedUser;
  activeRole: Role;
  /**
   * Preferred: grouped section structure for the Tier-1 + Tier-2 IA.
   * When both `sections` and the legacy `nav` are provided, `sections` wins.
   */
  sections?: NavSection[];
  /**
   * Legacy flat nav prop. Still honored — wrapped in a single unlabeled
   * section so older callers don't have to migrate atomically.
   */
  nav?: NavItem[];
  roleLabel: string;
  children: React.ReactNode;
}

function normalizeSections(
  sections: NavSection[] | undefined,
  nav: NavItem[] | undefined,
): NavSection[] {
  if (sections && sections.length > 0) return sections;
  if (nav && nav.length > 0) return [{ items: nav }];
  return [];
}

export function AppShell({
  user,
  activeRole,
  sections,
  nav,
  roleLabel,
  children,
}: AppShellProps) {
  // Logo links to the user's role home, not the public landing page.
  // This prevents the "logo click = logged out" UX bug.
  const homeHref = ROLE_HOME[activeRole] ?? "/";
  const resolved = normalizeSections(sections, nav);

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Side nav */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-surface relative">
        {/* Subtle radial glow at the top of the rail for warmth */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 0%, var(--highlight-soft), transparent 70%)",
          }}
        />

        <div className="relative px-5 pt-6 pb-5">
          <Link href={homeHref} className="block">
            <Wordmark size="md" />
          </Link>
          <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-text-subtle">
            {roleLabel}
          </p>
        </div>

        <nav aria-label="Main navigation" className="relative px-3 flex-1 mt-2 overflow-y-auto">
          <NavSections sections={resolved} />
        </nav>

        <div className="relative p-3 border-t border-border/80">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-md bg-surface-muted/50">
            <Avatar firstName={user.firstName} lastName={user.lastName} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text truncate">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs text-text-subtle truncate">{user.email}</div>
            </div>
          </div>
          <form action={logoutAction} className="mt-2">
            <button
              type="submit"
              className="w-full text-left text-xs text-text-subtle hover:text-text px-3 py-1.5 transition-colors"
            >
              Sign out →
            </button>
          </form>
          <p className="text-[9px] text-text-subtle italic leading-tight mt-3 px-2 line-clamp-2">
            Cannabis should be considered a medicine — please use it carefully
            and judiciously. Respect the plant and its healing properties.
          </p>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 h-16 border-b border-border bg-surface">
          <Link href={homeHref} className="flex items-center gap-2">
            <Wordmark size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <MobileNav sections={resolved} />
            <Avatar firstName={user.firstName} lastName={user.lastName} size="sm" />
          </div>
        </header>
        <main id="main-content" className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
