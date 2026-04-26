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

// Inline script that runs before paint to apply the stored theme.
// Avoids the brief flash of light mode for dark-mode users.
const THEME_BOOTSTRAP = `
(function(){try{
  var t=localStorage.getItem('leafmart-theme');
  if(!t){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
  if(t==='dark'){
    var els=document.getElementsByClassName('theme-leafmart');
    for(var i=0;i<els.length;i++){els[i].classList.add('dark');}
  }
}catch(e){}})();
`;

export default function LeafmartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      {/* Skip-to-content — visible only when keyboard-focused */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-[var(--ink)] focus:text-[#FFF8E8] focus:px-4 focus:py-2 focus:rounded-full focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to content
      </a>
      <div
        className="theme-leafmart min-h-screen bg-bg text-text flex flex-col font-sans antialiased selection:bg-highlight-soft selection:text-accent-strong"
        suppressHydrationWarning
      >
        <script
          // No FOUC: applies stored or system theme synchronously before paint
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }}
        />
        <LeafmartHeader />
        <main id="main-content" className="flex-1" tabIndex={-1}>{children}</main>
        <LeafmartFooter />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
