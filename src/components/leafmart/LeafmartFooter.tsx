"use client";

import Link from "next/link";
import { useState } from "react";

const COLUMNS = [
  { title: "Shelves", links: [
    { label: "Sleep", href: "/leafmart/category/sleep" },
    { label: "Recovery", href: "/leafmart/category/recovery" },
    { label: "Calm", href: "/leafmart/category/calm" },
    { label: "Skin", href: "/leafmart/category/skin" },
    { label: "Focus", href: "/leafmart/category/focus" },
  ]},
  { title: "About", links: [
    { label: "The Method", href: "/leafmart/about" },
    { label: "Vendors", href: "/leafmart/vendors" },
    { label: "Field Notes", href: "/leafmart/about#field-notes" },
    { label: "Careers", href: "/leafmart/about#careers" },
  ]},
  { title: "Help", links: [
    { label: "FAQ", href: "/leafmart/faq" },
    { label: "Shipping", href: "/leafmart/faq#shipping" },
    { label: "Returns", href: "/leafmart/faq#returns" },
    { label: "Contact", href: "/leafmart/faq#contact" },
  ]},
  { title: "Legal", links: [
    { label: "Terms", href: "/leafmart/faq#terms" },
    { label: "Privacy", href: "/security" },
    { label: "21+ Notice", href: "/leafmart/faq#age" },
    { label: "State Availability", href: "/leafmart/faq#states" },
  ]},
];

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--border)] sm:border-b-0">
      {/* Mobile: button toggles. Desktop: title sits as a heading. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between py-4 sm:py-0 sm:cursor-default sm:pointer-events-none text-left"
      >
        <span className="text-[12.5px] font-semibold tracking-[1.2px] uppercase text-[var(--ink)] sm:mb-3.5 block">
          {title}
        </span>
        <span
          aria-hidden="true"
          className="sm:hidden text-[var(--muted)] text-2xl leading-none transition-transform duration-200"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0)" }}
        >
          +
        </span>
      </button>
      <ul
        className="overflow-hidden sm:!max-h-none sm:!opacity-100 sm:!visible sm:block space-y-2.5 sm:pb-0 transition-[max-height,opacity] duration-300 ease-out"
        style={{
          maxHeight: open ? "300px" : "0px",
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          paddingBottom: open ? "16px" : "0px",
        }}
      >
        {links.map((link) => (
          <li key={link.label}>
            <Link href={link.href} className="text-sm text-[var(--text-soft)] hover:text-[var(--text)] transition-colors">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LeafmartFooter() {
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-14 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-8 gap-y-2 sm:gap-y-8 mb-8 sm:mb-10">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1 mb-6 sm:mb-0">
            <div className="flex items-center gap-2.5 mb-3.5">
              <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
                <circle cx="16" cy="16" r="15" fill="var(--leaf)" />
                <path d="M11 17.5 L14.5 21 L21.5 12.5" stroke="#F5E6B8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              <span className="font-display text-[22px] font-medium tracking-tight">Leafmart</span>
            </div>
            <p className="text-[13.5px] text-[var(--text-soft)] leading-relaxed max-w-[280px]">
              A clinician-curated cannabis wellness marketplace. From Leafjourney Health.
            </p>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <FooterColumn key={col.title} title={col.title} links={col.links} />
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-[var(--border)] flex flex-col md:flex-row justify-between gap-3 text-xs text-[var(--muted)]">
          <div>&copy; {new Date().getFullYear()} Leafmart, from Leafjourney Health.</div>
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
            <span>Hemp-derived products ship nationally where permitted.</span>
            <span>Licensed cannabis available intrastate only.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
