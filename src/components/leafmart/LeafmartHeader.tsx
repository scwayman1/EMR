"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV_LINKS = [
  { label: "Sleep", href: "/leafmart/category/sleep" },
  { label: "Recovery", href: "/leafmart/category/recovery" },
  { label: "Calm", href: "/leafmart/category/calm" },
  { label: "Skin", href: "/leafmart/category/skin" },
  { label: "Focus", href: "/leafmart/category/focus" },
];

const SECONDARY_LINKS = [
  { label: "The Method", href: "/leafmart/about" },
  { label: "Vendors", href: "/leafmart/vendors" },
];

/**
 * Leafmart header — MEDVi-inspired. Green circle logomark with butter
 * checkmark, Fraunces wordmark, category nav, trust links, and pill CTA.
 * Collapses into a hamburger menu on screens narrower than md (768px).
 */
export function LeafmartHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Outside click + Escape
  useEffect(() => {
    if (!open) return;
    function handlePointer(e: MouseEvent | TouchEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Lock body scroll while menu is open
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : prev;
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-30 bg-[var(--bg)]/90 backdrop-blur border-b border-[var(--border)]">
      <nav className="max-w-[1440px] mx-auto flex items-center justify-between px-5 sm:px-6 lg:px-14 h-[64px] md:h-[72px]">
        {/* Logo */}
        <Link href="/leafmart" className="flex items-center gap-2.5 group" aria-label="Leafmart home">
          <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true" className="md:w-8 md:h-8">
            <circle cx="16" cy="16" r="15" fill="var(--leaf)" />
            <path d="M11 17.5 L14.5 21 L21.5 12.5" stroke="#F5E6B8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <span className="font-display text-[21px] md:text-2xl font-medium tracking-tight text-[var(--ink)] group-hover:text-[var(--leaf)] transition-colors">
            Leafmart
          </span>
        </Link>

        {/* Desktop category nav */}
        <div className="hidden md:flex items-center gap-7 text-[14.5px] font-medium text-[var(--text)]">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-[var(--leaf)] transition-colors">
              {l.label}
            </Link>
          ))}
          <span className="text-[var(--border)]">|</span>
          {SECONDARY_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-[var(--leaf)] transition-colors">
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3.5">
          <Link href="/login" className="hidden sm:inline text-sm font-medium text-[var(--text)] hover:text-[var(--leaf)] transition-colors">
            Sign in
          </Link>
          <Link
            href="/leafmart/quiz"
            className="bg-[var(--ink)] text-[#FFF8E8] rounded-full px-[18px] py-[10px] text-[13px] font-medium tracking-wide hover:bg-[var(--leaf)] transition-colors"
          >
            Take the quiz
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="leafmart-mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="md:hidden inline-flex items-center justify-center w-11 h-11 -mr-2 rounded-full text-[var(--ink)] hover:bg-[var(--surface-muted)] transition-colors"
        >
          <span className="relative block w-5 h-4" aria-hidden="true">
            <span
              className="absolute left-0 right-0 h-[2px] rounded bg-current transition-all duration-300"
              style={{
                top: open ? "7px" : "0px",
                transform: open ? "rotate(45deg)" : "rotate(0)",
              }}
            />
            <span
              className="absolute left-0 right-0 top-[7px] h-[2px] rounded bg-current transition-opacity duration-200"
              style={{ opacity: open ? 0 : 1 }}
            />
            <span
              className="absolute left-0 right-0 h-[2px] rounded bg-current transition-all duration-300"
              style={{
                top: open ? "7px" : "14px",
                transform: open ? "rotate(-45deg)" : "rotate(0)",
              }}
            />
          </span>
        </button>
      </nav>

      {/* Mobile slide-down panel */}
      <div
        id="leafmart-mobile-nav"
        ref={panelRef}
        className="md:hidden overflow-hidden border-t border-[var(--border)] bg-[var(--bg)]"
        style={{
          maxHeight: open ? "calc(100vh - 64px)" : "0px",
          opacity: open ? 1 : 0,
          transition: "max-height 320ms cubic-bezier(0.2, 0, 0, 1), opacity 200ms ease",
          visibility: open ? "visible" : "hidden",
        }}
      >
        <div className="px-5 sm:px-6 pt-4 pb-7 flex flex-col">
          <div className="flex flex-col">
            {NAV_LINKS.map((l, i) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-3 font-display text-[22px] tracking-tight text-[var(--ink)] hover:text-[var(--leaf)] transition-colors border-b border-[var(--border)] lm-fade-in"
                style={{ animationDelay: open ? `${40 + i * 30}ms` : "0ms" }}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col mt-4">
            {SECONDARY_LINKS.map((l, i) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2.5 text-[15px] font-medium text-[var(--text)] hover:text-[var(--leaf)] transition-colors lm-fade-in"
                style={{ animationDelay: open ? `${220 + i * 30}ms` : "0ms" }}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/leafmart/faq"
              onClick={() => setOpen(false)}
              className="py-2.5 text-[15px] font-medium text-[var(--text)] hover:text-[var(--leaf)] transition-colors lm-fade-in"
              style={{ animationDelay: open ? "280ms" : "0ms" }}
            >
              FAQ
            </Link>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="py-2.5 text-[15px] font-medium text-[var(--text)] hover:text-[var(--leaf)] transition-colors lm-fade-in"
              style={{ animationDelay: open ? "310ms" : "0ms" }}
            >
              Sign in
            </Link>
          </div>

          <Link
            href="/leafmart/quiz"
            onClick={() => setOpen(false)}
            className="mt-6 inline-flex items-center justify-center bg-[var(--ink)] text-[#FFF8E8] rounded-full px-6 py-4 text-[15px] font-medium tracking-wide hover:bg-[var(--leaf)] transition-colors lm-fade-in"
            style={{ animationDelay: open ? "360ms" : "0ms" }}
          >
            Take the quiz →
          </Link>
        </div>
      </div>
    </header>
  );
}
