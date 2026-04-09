import * as React from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
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
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-surface">
        <div className="px-5 py-5">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-md bg-accent flex items-center justify-center text-white font-semibold text-sm">
              GP
            </div>
            <div>
              <div className="text-sm font-semibold text-text tracking-tight leading-4">
                {user.organizationName ?? "Green Path"}
              </div>
              <div className="text-xs text-text-subtle">{roleLabel}</div>
            </div>
          </Link>
        </div>
        <nav className="px-3 flex-1">
          <ul className="space-y-0.5">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-text-muted",
                    "hover:bg-surface-muted hover:text-text transition-colors duration-200 ease-smooth"
                  )}
                >
                  {item.icon && (
                    <span className="text-text-subtle group-hover:text-text">
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2.5 px-2">
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
              className="w-full text-left text-xs text-text-subtle hover:text-text px-2 py-1 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-surface">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-accent flex items-center justify-center text-white font-semibold text-xs">
              GP
            </div>
            <span className="text-sm font-semibold text-text">{roleLabel}</span>
          </Link>
          <Avatar firstName={user.firstName} lastName={user.lastName} size="sm" />
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
