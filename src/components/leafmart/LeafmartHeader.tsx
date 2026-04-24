import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LeafSprig } from "@/components/ui/ornament";

/**
 * Public Leafmart header. Intentionally lighter than the EMR-branded
 * site chrome — Leafmart is the consumer storefront and should feel
 * like a marketplace, not a medical tool.
 */
export function LeafmartHeader() {
  return (
    <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur border-b border-border">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between px-6 lg:px-12 h-16">
        <Link
          href="/leafmart"
          className="flex items-center gap-2 group"
          aria-label="Leafmart home"
        >
          <LeafSprig size={20} className="text-accent" />
          <span className="font-display text-xl tracking-tight text-text group-hover:text-accent transition-colors">
            Leafmart
          </span>
        </Link>

        <nav className="flex items-center gap-0.5 md:gap-1">
          <Link
            href="/leafmart/products"
            className="text-xs md:text-sm text-text-muted hover:text-text px-2 md:px-3 py-2 transition-colors"
          >
            Shop
          </Link>
          <Link
            href="/leafmart/about"
            className="text-xs md:text-sm text-text-muted hover:text-text px-2 md:px-3 py-2 transition-colors"
          >
            About
          </Link>
          <Link
            href="/leafmart/vendors"
            className="text-xs md:text-sm text-text-muted hover:text-text px-2 md:px-3 py-2 transition-colors"
          >
            Partner with us
          </Link>
          <Link
            href="/education"
            className="text-xs md:text-sm text-text-muted hover:text-text px-2 md:px-3 py-2 transition-colors"
          >
            Education
          </Link>
          <Link
            href="/login"
            className="text-xs md:text-sm text-text-muted hover:text-text px-2 md:px-3 py-2 transition-colors"
          >
            Sign in
          </Link>
          <Link href="/portal/shop" className="ml-1">
            <Button size="sm" variant="primary">
              Shop
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
