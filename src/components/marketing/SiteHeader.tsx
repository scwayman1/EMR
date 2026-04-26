"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Wordmark } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { label: "About", href: "/about" },
  { label: "Security", href: "/security" },
  { label: "Education", href: "/education" },
  { label: "Leafmart", href: "/leafmart" },
  { label: "Developer", href: "/developer" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled || undefined}
      className="sticky top-0 z-30 backdrop-blur-lg bg-bg/80 border-b border-transparent transition-[border-color,background-color] duration-300 data-[scrolled]:border-border data-[scrolled]:bg-bg/95"
    >
      <div className="max-w-[1320px] mx-auto flex items-center justify-between px-6 lg:px-12 h-16">
        <Link href="/" aria-label="Leafjourney home">
          <Wordmark size="md" />
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-text-muted hover:text-text px-3 py-2 rounded-lg hover:bg-surface-muted transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline text-sm text-text-muted hover:text-text px-3 py-2 transition-colors"
          >
            Sign in
          </Link>
          <Link href="/signup">
            <Button size="sm">Request Demo</Button>
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 -mr-2"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" className="text-text">
              <line
                x1="3"
                y1={menuOpen ? "10" : "5"}
                x2="17"
                y2={menuOpen ? "10" : "5"}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                style={{
                  transform: menuOpen ? "rotate(45deg)" : "none",
                  transformOrigin: "center",
                  transition: "all 0.3s",
                }}
              />
              <line
                x1="3"
                y1="10"
                x2="17"
                y2="10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                style={{ opacity: menuOpen ? 0 : 1, transition: "opacity 0.2s" }}
              />
              <line
                x1="3"
                y1={menuOpen ? "10" : "15"}
                x2="17"
                y2={menuOpen ? "10" : "15"}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                style={{
                  transform: menuOpen ? "rotate(-45deg)" : "none",
                  transformOrigin: "center",
                  transition: "all 0.3s",
                }}
              />
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-border bg-bg px-6 py-4 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block text-sm text-text-muted hover:text-text px-3 py-2.5 rounded-lg hover:bg-surface-muted transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="block text-sm text-text-muted hover:text-text px-3 py-2.5"
          >
            Sign in
          </Link>
        </div>
      )}
    </header>
  );
}
