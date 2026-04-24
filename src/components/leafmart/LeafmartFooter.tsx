import Link from "next/link";
import { LeafSprig } from "@/components/ui/ornament";

export function LeafmartFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface-muted/40">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <LeafSprig size={18} className="text-accent" />
              <span className="font-display text-lg tracking-tight text-text">
                Leafmart
              </span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Physician-curated cannabis wellness products. Every product on
              Leafmart is reviewed by our care team for quality, lab
              verification, and real-world patient outcomes.
            </p>
          </div>

          <FooterColumn title="Shop">
            <FooterLink href="/leafmart/products">All products</FooterLink>
            <FooterLink href="/leafmart/category/sleep">Sleep</FooterLink>
            <FooterLink href="/leafmart/category/calm">Calm</FooterLink>
            <FooterLink href="/leafmart/category/focus">Focus</FooterLink>
            <FooterLink href="/leafmart/category/recovery">Recovery</FooterLink>
          </FooterColumn>

          <FooterColumn title="Leafmart">
            <FooterLink href="/leafmart/about">About us</FooterLink>
            <FooterLink href="/leafmart/vendors">Partner with us</FooterLink>
            <FooterLink href="/leafmart/faq">FAQ</FooterLink>
            <FooterLink href="/education">Education</FooterLink>
          </FooterColumn>

          <FooterColumn title="Trust">
            <FooterLink href="/security">Security</FooterLink>
            <FooterLink href="/leafmart/faq#lab-testing">Lab testing</FooterLink>
            <FooterLink href="/leafmart/faq#clinician-review">
              Clinician review
            </FooterLink>
            <FooterLink href="/login">Sign in</FooterLink>
          </FooterColumn>
        </div>

        <div className="pt-6 border-t border-border flex flex-col md:flex-row justify-between gap-3 text-[11px] text-text-subtle">
          <p>
            &copy; {new Date().getFullYear()} Leafjourney Health. Leafmart is
            Leafjourney&apos;s public marketplace.
          </p>
          <p className="uppercase tracking-wider">
            Products may contain cannabinoids. 21+ where required by law.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-text mb-3">
        {title}
      </p>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-xs text-text-muted hover:text-text transition-colors"
      >
        {children}
      </Link>
    </li>
  );
}
