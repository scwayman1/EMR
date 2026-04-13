import { cn } from "@/lib/utils/cn";

const TRUST_ITEMS = [
  { icon: "\u2695", label: "Physician Curated" },
  { icon: "\u2714", label: "Third-Party Lab Tested" },
  { icon: "\u2726", label: "Premium Formulations" },
  { icon: "\u26BF", label: "Secure Checkout" },
] as const;

interface TrustStripProps {
  className?: string;
}

export function TrustStrip({ className }: TrustStripProps) {
  return (
    <div
      className={cn(
        "w-full bg-accent-soft py-3 px-4",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
        {TRUST_ITEMS.map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-1.5 text-sm text-text-muted"
          >
            <span className="text-accent" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
