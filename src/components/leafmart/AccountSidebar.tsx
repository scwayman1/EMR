"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/leafmart/account", label: "Dashboard" },
  { href: "/leafmart/account/orders", label: "Orders" },
  { href: "/leafmart/account/outcomes", label: "Outcomes" },
  { href: "/leafmart/account/rewards", label: "Rewards" },
  { href: "/leafmart/account/addresses", label: "Addresses" },
  { href: "/leafmart/consult", label: "Consultations" },
];

export function AccountSidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex lg:flex-col gap-1 lg:gap-2 overflow-x-auto lg:overflow-visible -mx-2 px-2 lg:mx-0 lg:px-0">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className="px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
            style={
              active
                ? { background: "var(--ink)", color: "#FFF8E8" }
                : { background: "transparent", color: "var(--text-soft)" }
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
