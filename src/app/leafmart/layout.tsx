import type { Metadata } from "next";
import { LeafmartHeader } from "@/components/leafmart/LeafmartHeader";
import { LeafmartFooter } from "@/components/leafmart/LeafmartFooter";
import { CartProvider } from "@/lib/leafmart/cart-store";
import { CartDrawer } from "@/components/leafmart/CartDrawer";

export const metadata: Metadata = {
  title: {
    default: "Leafmart — Physician-curated cannabis wellness",
    template: "%s | Leafmart",
  },
  description:
    "The marketplace for physician-curated cannabis wellness products. Every product reviewed for quality, lab verification, and real patient outcomes.",
};

export default function LeafmartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="theme-leafmart min-h-screen bg-bg text-text flex flex-col font-sans antialiased selection:bg-highlight-soft selection:text-accent-strong">
        <LeafmartHeader />
        <main className="flex-1">{children}</main>
        <LeafmartFooter />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
