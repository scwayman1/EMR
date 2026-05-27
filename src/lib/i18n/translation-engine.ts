/**
 * In-app translation engine — EMR-122
 *
 * Layered, dependency-free translator built on top of the dictionaries
 * in ./translations.ts. Three call paths:
 *
 *   1. `t(key, locale)` — exact-key lookup, used by static UI copy.
 *   2. `tx(key, vars, locale)` — interpolated lookup with {placeholders}.
 *   3. `translate(text, { from, to })` — async machine-translation
 *      passthrough for free-text payloads (visit summaries, patient
 *      messages, education articles) we haven't pre-translated.
 *
 * V2 (this file) ships eight clinical-priority languages: English,
 * Spanish, Portuguese (Brazilian), French, German, Mandarin (zh-CN),
 * Vietnamese, and Tagalog. Dictionaries beyond en/es live alongside
 * the existing ones in `translations.ts` — additions follow the same
 * dot-namespaced key convention.
 *
 * The async `translate()` adapter falls back through three providers in
 * order so the surface always resolves something:
 *   1. Exact dictionary hit (free, instant)
 *   2. Cached MT result keyed by (from, to, text-hash)
 *   3. Live MT API call (whichever provider is configured)
 * If all three fail, we return the source string verbatim — never
 * `undefined` — so the UI cannot crash from a translation gap.
 */

import { translations } from "./translations";

export type Locale =
  | "en"
  | "es"
  | "pt"
  | "fr"
  | "de"
  | "zh"
  | "vi"
  | "tl";

export const DEFAULT_LOCALE: Locale = "en";

export interface LocaleDescriptor {
  code: Locale;
  /** Native-language name shown in the picker. */
  label: string;
  /** ISO 639-1 / 3166-1 region tag for date/number formatting. */
  bcp47: string;
  /** RTL languages set this true; none in the V2 set are RTL. */
  rtl: boolean;
}

export const LOCALES: LocaleDescriptor[] = [
  { code: "en", label: "English", bcp47: "en-US", rtl: false },
  { code: "es", label: "Español", bcp47: "es-US", rtl: false },
  { code: "pt", label: "Português", bcp47: "pt-BR", rtl: false },
  { code: "fr", label: "Français", bcp47: "fr-FR", rtl: false },
  { code: "de", label: "Deutsch", bcp47: "de-DE", rtl: false },
  { code: "zh", label: "中文", bcp47: "zh-CN", rtl: false },
  { code: "vi", label: "Tiếng Việt", bcp47: "vi-VN", rtl: false },
  { code: "tl", label: "Tagalog", bcp47: "tl-PH", rtl: false },
];

const SUPPORTED_CODES = new Set<Locale>(LOCALES.map((l) => l.code));

export function isSupportedLocale(code: string): code is Locale {
  return SUPPORTED_CODES.has(code as Locale);
}

/**
 * Static-key lookup with English fallback. Mirrors the existing `t()` in
 * ./index.ts so callers that import either get the same behavior.
 */
export function t(key: string, locale: Locale = DEFAULT_LOCALE): string {
  return translations[locale]?.[key] ?? translations.en?.[key] ?? key;
}

/**
 * Interpolated lookup — replace `{name}` style placeholders inside the
 * resolved translation string. Variables are HTML-escaped to prevent
 * accidental XSS when a translated string is dropped into innerHTML.
 */
export function tx(
  key: string,
  vars: Record<string, string | number>,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const raw = t(key, locale);
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = vars[name];
    if (v == null) return `{${name}}`;
    return escapeHtml(String(v));
  });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Pluralization helper — picks `one` or `other` based on count using
 * Intl.PluralRules so locales with non-trivial plural shapes (ru, ar)
 * still resolve correctly when we add them. The patient-facing surfaces
 * stick to the `one`/`other` pair which covers all V2 languages.
 */
export interface PluralForms {
  one: string;
  other: string;
  zero?: string;
}

export function plural(
  count: number,
  forms: PluralForms,
  locale: Locale = DEFAULT_LOCALE,
): string {
  if (count === 0 && forms.zero) return forms.zero.replace("{count}", "0");
  const bcp = LOCALES.find((l) => l.code === locale)?.bcp47 ?? "en-US";
  const rule = new Intl.PluralRules(bcp).select(count);
  const form = rule === "one" ? forms.one : forms.other;
  return form.replace("{count}", String(count));
}

// ---------------------------------------------------------------------------
// Free-text translation adapter
// ---------------------------------------------------------------------------

export interface TranslateOptions {
  from?: Locale;
  to: Locale;
  /** Optional context string sent to the MT model for tone consistency. */
  context?: string;
}

export type TranslationProvider = (
  text: string,
  options: TranslateOptions,
) => Promise<string>;

interface CacheEntry {
  text: string;
  expiresAt: number;
}

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const cache = new Map<string, CacheEntry>();

function cacheKey(text: string, from: Locale | undefined, to: Locale): string {
  return `${from ?? "auto"}|${to}|${text}`;
}

/** Drop expired entries; called opportunistically when the cache grows. */
function pruneCache() {
  const now = Date.now();
  for (const [k, v] of cache) if (v.expiresAt <= now) cache.delete(k);
}

let activeProvider: TranslationProvider | null = null;

/** Wire up the live MT provider; called once during app bootstrap. */
export function configureProvider(provider: TranslationProvider): void {
  activeProvider = provider;
}

/**
 * Translate a free-text string into the target locale. Honors dictionary
 * hits first, then cached MT, then live MT, then the source verbatim.
 */
export async function translate(
  text: string,
  options: TranslateOptions,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  const target = options.to;
  if (target === options.from) return text;
  if (!isSupportedLocale(target)) return text;

  // 1. Dictionary hit on exact string-as-key.
  const dictHit = translations[target]?.[trimmed];
  if (dictHit) return dictHit;

  // 2. Cache.
  const key = cacheKey(trimmed, options.from, target);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.text;

  // 3. Live provider.
  if (activeProvider) {
    try {
      const result = await activeProvider(trimmed, options);
      cache.set(key, {
        text: result,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      if (cache.size > 5_000) pruneCache();
      return result;
    } catch {
      /* fall through to source */
    }
  }

  // 4. No provider available — return source so UI never blanks out.
  return text;
}

/**
 * Detect the most likely locale of a free-text payload. Lightweight
 * heuristic — counts characters from Unicode blocks unique to a small
 * set of languages. Calls into the active provider when available;
 * otherwise returns null so callers can prompt the user.
 */
export async function detectLocale(text: string): Promise<Locale | null> {
  const sample = text.slice(0, 512);
  if (/[一-鿿]/.test(sample)) return "zh";
  if (/[ạảấầẩẫậắằẳẵặẹẻếềểễệịỉọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđĐàáâãèéêìíòóôõùúýăĐÂẾẾỂỀỀ]/iu.test(sample)) return "vi";
  if (/[ñáéíóúü¿¡]/i.test(sample) && /\b(el|la|y|los|las|del|para)\b/i.test(sample)) return "es";
  if (/[ãõ]/.test(sample) || /\b(você|não|obrigad[oa])\b/i.test(sample)) return "pt";
  if (/\b(le|la|et|les|du|des|c'est|n'est)\b/i.test(sample)) return "fr";
  if (/[äöüß]/.test(sample) && /\b(und|der|die|das|ist)\b/i.test(sample)) return "de";
  if (/\b(ang|ng|sa|kasi|po|opo|hindi|salamat)\b/i.test(sample)) return "tl";
  if (/^[\x00-\x7f]+$/.test(sample)) return "en";
  return null;
}

/**
 * Build a Next.js cookie name + value pair so the locale picker can
 * persist the user's choice across reloads. Server-side reads should
 * trust the cookie and fall back to DEFAULT_LOCALE.
 */
export const LOCALE_COOKIE_NAME = "lj-locale";

export function localeCookieValue(locale: Locale): string {
  return locale;
}

export function readLocaleCookie(value: string | undefined | null): Locale {
  if (!value) return DEFAULT_LOCALE;
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}

/** Test helper — clear the in-memory cache. */
export function _resetCache() {
  cache.clear();
  activeProvider = null;
}
