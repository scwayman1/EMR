import Link from "next/link";
import { cn } from "@/lib/utils/cn";

// EMR-188 / EMR-303 — Amazon-style department bar. Horizontal, scrollable
// on mobile, with the active department highlighted.

export interface Department {
  label: string;
  href: string;
  /** Slug used to mark the active department. */
  key: string;
}

export function DepartmentNav({
  departments,
  activeKey,
  className,
}: {
  departments: Department[];
  activeKey?: string;
  className?: string;
}) {
  return (
    <nav
      aria-label="Shop departments"
      className={cn(
        "flex gap-1 overflow-x-auto border-y border-border bg-surface/80 px-4 py-2 backdrop-blur-sm lg:px-12",
        className,
      )}
    >
      {departments.map((d) => {
        const active = d.key === activeKey;
        return (
          <Link
            key={d.key}
            href={d.href}
            className={cn(
              "whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "bg-accent text-accent-ink"
                : "text-text-muted hover:bg-surface-muted hover:text-text",
            )}
            aria-current={active ? "page" : undefined}
          >
            {d.label}
          </Link>
        );
      })}
    </nav>
  );
}
