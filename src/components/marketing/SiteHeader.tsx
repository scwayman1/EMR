"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Wordmark } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { MobilePortraitNav } from "@/components/layout/MobilePortraitNav";

const NAV_LINKS = [
  { label: "About", href: "/about" },
  { label: "Security", href: "/security" },
  { label: "Education", href: "/education" },
  { label: "Leafmart", href: "/leafmart" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Developer", href: "/developer" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

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
      <div className="max-w-[1320px] mx-auto flex items-center justify-between gap-2 px-3 sm:px-6 lg:px-12 h-16">
        <Link href="/" aria-label="Leafjourney home" className="shrink-0">
          <Wordmark size="md" />
        </Link>

        {/* EMR-189: tablet+ only — phones get the swipeable grid below. */}
        <nav
          className="hidden md:flex flex-1 min-w-0 items-center gap-0.5 overflow-x-auto no-scrollbar"
          aria-label="Main"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs sm:text-sm text-text-muted hover:text-text px-2 sm:px-3 py-2 rounded-lg hover:bg-surface-muted transition-colors whitespace-nowrap shrink-0"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="text-xs sm:text-sm text-text-muted hover:text-text px-2 sm:px-3 py-2 rounded-lg hover:bg-surface-muted transition-colors whitespace-nowrap shrink-0"
          >
            Sign in
          </Link>
        </nav>

        <Link href="/signup" className="shrink-0">
          <Button size="sm" className="px-2.5 sm:px-3.5 text-xs sm:text-sm">
            Demo
          </Button>
        </Link>
      </div>

      {/* EMR-189: mobile-portrait grid — every primary tab visible without
          a hamburger. Hidden at md+ where the inline nav above is shown. */}
      <MobilePortraitNav />
    </header>
  );
}
