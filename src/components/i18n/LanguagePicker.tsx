"use client";

// EMR-283 — Language picker scaffold.
//
// Patient-facing dropdown that sets a `leafjourney_lng` cookie. The
// actual translation pipeline (string extraction, AI translation,
// per-locale routing under `/[lng]/...`) is a follow-up — this
// component lets us ship the UI affordance now so the locales we
// already plan to support are visible to patients and partners.
//
// When the i18n pipeline lands, swap the cookie write for a
// `useRouter().push("/" + code + path)` and pull strings from the
// `next-intl` (or chosen) library. The supported-locale list lives
// here so it's easy to add a language without touching the picker.

import { useState, useCallback, useEffect } from "react";

export interface Locale {
  code: string;
  englishName: string;
  nativeName: string;
}

export const SUPPORTED_LOCALES: Locale[] = [
  { code: "en", englishName: "English", nativeName: "English" },
  { code: "es", englishName: "Spanish", nativeName: "Español" },
  { code: "vi", englishName: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "fr", englishName: "French", nativeName: "Français" },
  { code: "zh", englishName: "Chinese", nativeName: "中文" },
  { code: "ar", englishName: "Arabic", nativeName: "العربية" },
  { code: "pt", englishName: "Portuguese", nativeName: "Português" },
  { code: "ko", englishName: "Korean", nativeName: "한국어" },
];

const COOKIE_NAME = "leafjourney_lng";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function readCookie(): string {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : "en";
}

function writeCookie(code: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(code)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function LanguagePicker({ className = "" }: { className?: string }) {
  const [code, setCode] = useState<string>("en");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setCode(readCookie());
  }, []);

  const select = useCallback((next: string) => {
    setCode(next);
    writeCookie(next);
    setOpen(false);
    // Until the per-locale router lands, reload to re-pick up the
    // cookie everywhere in the tree. Cheap, predictable.
    if (typeof window !== "undefined") window.location.reload();
  }, []);

  const current =
    SUPPORTED_LOCALES.find((l) => l.code === code) ?? SUPPORTED_LOCALES[0];

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-[12.5px] text-[var(--text)] hover:bg-[var(--surface-muted)] transition-colors"
      >
        <span aria-hidden="true">🌐</span>
        <span>{current.nativeName}</span>
        <span aria-hidden="true" className="text-[var(--muted)]">▾</span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-30 mt-2 min-w-[200px] rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden"
        >
          {SUPPORTED_LOCALES.map((l) => {
            const active = l.code === code;
            return (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => select(l.code)}
                  className={`w-full text-left px-3 py-2 text-[13px] flex items-center justify-between gap-3 hover:bg-[var(--surface-muted)] ${
                    active ? "text-[var(--leaf)]" : "text-[var(--text)]"
                  }`}
                >
                  <span>{l.nativeName}</span>
                  <span className="text-[11px] text-[var(--muted)]">
                    {l.englishName}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
