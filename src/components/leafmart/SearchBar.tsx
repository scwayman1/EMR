"use client";

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  ariaLabel?: string;
  size?: "md" | "sm";
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search products, partners, formats…",
  autoFocus,
  className = "",
  ariaLabel = "Search the shelf",
  size = "md",
}: SearchBarProps) {
  const pad = size === "sm" ? "py-2.5 pl-11 pr-4 text-[14px]" : "py-3.5 pl-12 pr-5 text-[15px]";
  const iconLeft = size === "sm" ? "left-4" : "left-5";

  return (
    <div className={`relative ${className}`}>
      <span
        aria-hidden
        className={`absolute ${iconLeft} top-1/2 -translate-y-1/2 text-[var(--leaf)] pointer-events-none`}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12.2 12.2L15.5 15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="search"
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        className={`w-full bg-[var(--surface-muted)] text-[var(--ink)] placeholder:text-[var(--text-subtle)] border border-[var(--border)] rounded-full ${pad} focus:outline-none focus:border-[var(--leaf)] focus:bg-[var(--surface)] transition-colors`}
      />
    </div>
  );
}
