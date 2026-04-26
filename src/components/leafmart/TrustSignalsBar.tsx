import Link from "next/link";

interface Props {
  labVerified?: boolean;
  coaUrl?: string | null;
  clinicianReviewed?: boolean;
  outcomeSampleSize?: number;
  freeShipping?: boolean;
}

/**
 * Sub-hero trust strip. Sits between the silhouette and the product info on
 * the PDP — what a patient should see before reading the description.
 */
export function TrustSignalsBar({
  labVerified = true,
  coaUrl,
  clinicianReviewed = true,
  outcomeSampleSize,
  freeShipping = true,
}: Props) {
  const signals: Array<{
    key: string;
    icon: React.ReactNode;
    label: string;
    sub?: string;
    href?: string;
  }> = [];

  if (labVerified) {
    signals.push({
      key: "lab",
      label: "Lab Verified",
      sub: "Third-party COA",
      href: coaUrl ?? undefined,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8 12.5l2.5 2.5L16 9.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    });
  }
  if (clinicianReviewed) {
    signals.push({
      key: "clin",
      label: "Clinician Reviewed",
      sub: "Medical desk approved",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M9 4.5L12 2L15 4.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      ),
    });
  }
  if (outcomeSampleSize && outcomeSampleSize > 0) {
    signals.push({
      key: "n",
      label: `n=${outcomeSampleSize.toLocaleString()} patients`,
      sub: "Outcome data",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 18V8M9 18V4M15 18v-7M21 18v-13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M2.5 21h19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    });
  }
  if (freeShipping) {
    signals.push({
      key: "ship",
      label: "Free Shipping",
      sub: "On orders $75+",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2.5 6h11v9h-11z M13.5 9.5h4l3 3v2.5h-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="6.5" cy="17.5" r="1.7" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="16.5" cy="17.5" r="1.7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    });
  }

  if (signals.length === 0) return null;

  return (
    <div className="rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)] px-3 py-3 mb-7 sm:mb-8">
      <ul className="grid grid-cols-2 sm:grid-cols-4 gap-1">
        {signals.map((s) => {
          const inner = (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
              <span className="text-[var(--leaf)] shrink-0">{s.icon}</span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-[var(--ink)] leading-tight truncate">
                  {s.label}
                </p>
                {s.sub && (
                  <p className="text-[11px] text-[var(--muted)] leading-tight truncate">{s.sub}</p>
                )}
              </div>
            </div>
          );
          return (
            <li key={s.key}>
              {s.href ? (
                <Link
                  href={s.href}
                  className="block hover:bg-[var(--surface)] rounded-xl transition-colors"
                >
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
