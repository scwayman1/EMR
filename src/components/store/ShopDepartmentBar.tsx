"use client";

// Department bar for the /shop surface. Derives the active department from
// the current path so the Amazon-style nav highlights where you are.

import { usePathname } from "next/navigation";
import { DepartmentNav, type Department } from "./DepartmentNav";

const DEPARTMENTS: Department[] = [
  { key: "all", label: "All", href: "/shop" },
  { key: "supply", label: "Supply & wellness", href: "/shop/supply" },
  { key: "rest", label: "Rest & sleep", href: "/shop?category=rest" },
  { key: "pain-support", label: "Pain support", href: "/shop?category=pain-support" },
  { key: "calm", label: "Calm", href: "/shop?category=calm" },
  { key: "clinician-picks", label: "Clinician picks", href: "/shop?category=clinician-picks" },
  { key: "distributors", label: "Our distributors", href: "/shop/distributors" },
];

export function ShopDepartmentBar() {
  const pathname = usePathname();
  let activeKey = "all";
  if (pathname?.startsWith("/shop/supply")) activeKey = "supply";
  else if (pathname?.startsWith("/shop/distributors")) activeKey = "distributors";
  return <DepartmentNav departments={DEPARTMENTS} activeKey={activeKey} />;
}
