import * as React from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Wordmark } from "@/components/ui/logo";
import { logoutAction } from "@/lib/auth/actions";
import type { AuthedUser } from "@/lib/auth/session";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils/cn";
import { MobileNav } from "./MobileNav";

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  /**
   * Optional live count shown as a pill next to the nav label. Use for
   * "needs your attention" counters like pending approvals. Hidden when 0.
   */
  count?: number;
  /**
   * Optional tone hint for the count pill. Defaults to "highlight" (warm
   * call-to-action). Use "danger" for emergencies in the queue.
   */
  countTone?: "highlight" | "danger" | "accent";
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

        <nav aria-label="Main navigation" className="relative px-3 flex-1 mt-2">
          <ul className="space-y-0.5">
            {nav.map((item) => {
              const count = item.count ?? 0;
              const tone = item.countTone ?? "highlight";
              const toneClass =
                tone === "danger"
                  ? "bg-danger/10 text-danger border-danger/30 animate-pulse"
                  : tone === "accent"
                    ? "bg-accent-soft text-accent border-accent/25"
                    : "bg-highlight-soft text-[color:var(--highlight-hover)] border-highlight/30";
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-label={
                      count > 0
                        ? `${item.label} (${count} waiting)`
                        : item.label
                    }
                    className={cn(
                      "group flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-text-muted",
                      "hover:bg-surface-muted hover:text-text transition-colors duration-200 ease-smooth"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="h-1 w-1 rounded-full bg-border-strong group-hover:bg-accent transition-colors"
                    />
                    <span className="flex-1">{item.label}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          "text-[10px] font-semibold leading-none rounded-full border px-1.5 py-0.5 tabular-nums",
                          toneClass
                        )}
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
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
          <div className="flex items-center gap-2">
            <MobileNav nav={nav} />
            <Avatar firstName={user.firstName} lastName={user.lastName} size="sm" />
          </div>
        </header>
        <main id="main-content" className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
