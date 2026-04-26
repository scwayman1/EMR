"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/leafmart/cart-store";
import { ThemeToggle } from "@/components/leafmart/ThemeToggle";
import { AccountUserMenu } from "@/components/leafmart/AccountUserMenu";

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
function CartBadgeButton({
  onClick,
  variant = "icon",
}: {
  onClick?: () => void;
  variant?: "icon" | "row";
}) {
  const { itemCount, openCart } = useCart();
  const handle = onClick ?? openCart;
  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={handle}
        className="flex items-center justify-between w-full py-2.5 text-[15px] font-medium text-[var(--text)] hover:text-[var(--leaf)] transition-colors"
      >
        <span className="flex items-center gap-3">
          <CartIcon />
          Cart
        </span>
        {itemCount > 0 && (
          <span className="bg-[var(--leaf)] text-[#FFF8E8] text-[11px] font-bold rounded-full w-[22px] h-[22px] flex items-center justify-center tabular-nums">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={handle}
      aria-label={itemCount > 0 ? `Open cart, ${itemCount} item${itemCount === 1 ? "" : "s"}` : "Open cart"}
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-full text-[var(--ink)] hover:bg-[var(--surface-muted)] transition-colors"
    >
      <CartIcon />
      {itemCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 bg-[var(--leaf)] text-[#FFF8E8] text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center tabular-nums"
          style={{ animation: "lmFadeInUp 280ms cubic-bezier(0.2, 0, 0, 1)" }}
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </button>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <path d="M4 5h14l-1.5 10a2 2 0 0 1-2 1.7H7.5A2 2 0 0 1 5.5 15L4 5z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5V4a3 3 0 0 1 6 0v1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function LeafmartHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Outside click + Escape + focus trap (panel + hamburger trigger).
  useEffect(() => {
    if (!open) return;
    function handlePointer(e: MouseEvent | TouchEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const inPanel = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled])'
      );
      const focusables: HTMLElement[] = [];
      if (buttonRef.current) focusables.push(buttonRef.current);
      inPanel.forEach((el) => focusables.push(el));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
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
      <nav aria-label="Main" className="max-w-[1440px] mx-auto flex items-center justify-between px-5 sm:px-6 lg:px-14 h-[64px] md:h-[72px]">
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
        <div className="hidden md:flex items-center gap-2 lg:gap-3">
          <AccountUserMenu />
          <ThemeToggle />
          <CartBadgeButton />
          <Link
            href="/leafmart/quiz"
            className="bg-[var(--ink)] text-[#FFF8E8] rounded-full px-[18px] py-[10px] text-[13px] font-medium tracking-wide hover:bg-[var(--leaf)] transition-colors"
          >
            Take the quiz
          </Link>
        </div>

        {/* Mobile actions: cart + hamburger */}
        <div className="md:hidden flex items-center gap-1">
          <CartBadgeButton />
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="leafmart-mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex items-center justify-center w-11 h-11 -mr-2 rounded-full text-[var(--ink)] hover:bg-[var(--surface-muted)] transition-colors"
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
        </div>
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
            <div
              className="lm-fade-in"
              style={{ animationDelay: open ? "200ms" : "0ms" }}
            >
              <CartBadgeButton onClick={() => setOpen(false)} variant="row" />
            </div>
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
            <div
              className="lm-fade-in"
              style={{ animationDelay: open ? "310ms" : "0ms" }}
            >
              <AccountUserMenu variant="mobile" onNavigate={() => setOpen(false)} />
            </div>
            <div
              className="flex items-center justify-between py-3 mt-1 border-t border-[var(--border)] lm-fade-in"
              style={{ animationDelay: open ? "340ms" : "0ms" }}
            >
              <span className="text-[14px] text-[var(--text-soft)]">Theme</span>
              <ThemeToggle />
            </div>
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
