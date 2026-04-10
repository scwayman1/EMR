import * as React from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Wordmark } from "@/components/ui/logo";
import { logoutAction } from "@/lib/auth/actions";
import type { AuthedUser } from "@/lib/auth/session";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils/cn";

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

export interface AppShellProps {
  user: AuthedUser;
  activeRole: Role;
  nav: NavItem[];
  roleLabel: string;
  children: React.ReactNode;
}

export function AppShell({ user, nav, roleLabel, children }: AppShellProps) {
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
          <Link href="/" className="block">
            <Wordmark size="md" />
          </Link>
          <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-text-subtle">
            {roleLabel}
          </p>
        </div>

        <nav className="relative px-3 flex-1 mt-2">
          <ul className="space-y-0.5">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-text-muted",
                    "hover:bg-surface-muted hover:text-text transition-colors duration-200 ease-smooth"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="h-1 w-1 rounded-full bg-border-strong group-hover:bg-accent transition-colors"
                  />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
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
          <Link href="/" className="flex items-center gap-2">
            <Wordmark size="sm" />
          </Link>
          <Avatar firstName={user.firstName} lastName={user.lastName} size="sm" />
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
