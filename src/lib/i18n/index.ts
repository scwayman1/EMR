import { translations } from "./translations";

/**
 * Supported locales for the cannabis care EMR.
 * V1 ships with English and Spanish. Add new locales here and in translations.ts.
 */
export type Locale = "en" | "es";

/** Default locale used when none is specified. */
export const DEFAULT_LOCALE: Locale = "en";

/** All supported locales, useful for building language pickers. */
export const SUPPORTED_LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
];

/**
 * Look up a translated string by key.
 *
 * Falls back to English if the key is missing in the requested locale,
 * then to the raw key if it's missing from English too (so the UI never
 * shows `undefined`).
 *
 * @example
 *   t("nav.home")            // "Home"
 *   t("nav.home", "es")      // "Inicio"
 *   t("missing.key")         // "missing.key"
 */
export function t(key: string, locale: Locale = DEFAULT_LOCALE): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}
