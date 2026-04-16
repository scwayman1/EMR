import Link from "next/link";
import { CartProvider } from "@/components/marketplace/CartProvider";
import { CartBadgeLink } from "@/components/marketplace/CartBadgeLink";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {/* Shop sub-topbar: always-on cart link + back-to-portal link. */}
      <div className="border-b border-border bg-surface">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-10 h-12 flex items-center justify-between">
          <Link
            href="/portal"
            className="text-xs text-text-subtle hover:text-text transition-colors"
          >
            &larr; Back to portal
          </Link>
          <CartBadgeLink />
        </div>
      </div>
      {children}
    </CartProvider>
  );
}
