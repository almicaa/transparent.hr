// Croatian lives at the root ("/jobs"), English under /en ("/en/jobs").
// Internally every page sits under app/[lang]/ with the Croatian folder names;
// middleware.ts rewrites public URLs onto those folders.

export const LOCALES = ["hr", "en"] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "hr"

/** Cookie remembering a language picked in the switcher. */
export const LOCALE_COOKIE = "NEXT_LOCALE"

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value)
}

/** BCP 47 tags for Intl and toLocaleString. en-GB: day-first dates, like the rest of Europe. */
export const INTL_LOCALE: Record<Locale, string> = { hr: "hr-HR", en: "en-GB" }
/** Open Graph og:locale values. */
export const OG_LOCALE: Record<Locale, string> = { hr: "hr_HR", en: "en_GB" }

// First path segment: Croatian folder name → English public name. Segments not
// listed ("jobs", "cv", "blog") are the same in both languages.
const EN_SEGMENTS: Record<string, string> = {
  "o-nama": "about",
  analitika: "analytics",
  spremljeno: "saved",
  privatnost: "privacy",
  "uvjeti-koristenja": "terms",
}
const HR_SEGMENTS: Record<string, string> = Object.fromEntries(Object.entries(EN_SEGMENTS).map(([hr, en]) => [en, hr]))

function mapFirstSegment(path: string, map: Record<string, string>): string {
  const [, first = "", ...rest] = path.split("/")
  const mapped = map[first]
  return mapped ? ["", mapped, ...rest].join("/") : path
}

/**
 * Public URL of a page in a language, from its internal (Croatian) path:
 * localePath("en", "/o-nama") → "/en/about", localePath("hr", "/o-nama") → "/o-nama".
 * A query string or #hash on the path is kept.
 */
export function localePath(locale: Locale, path: string): string {
  if (locale === DEFAULT_LOCALE) return path
  const cut = path.search(/[?#]/)
  const pathname = cut === -1 ? path : path.slice(0, cut)
  const suffix = cut === -1 ? "" : path.slice(cut)
  const localized = mapFirstSegment(pathname, EN_SEGMENTS)
  return `/${locale}${localized === "/" ? "" : localized}${suffix}`
}

/** The language a public pathname is in. */
export function localeFromPathname(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : DEFAULT_LOCALE
}

/** Internal (Croatian folder) path of a public pathname: "/en/about" → "/o-nama". */
export function internalPath(pathname: string): string {
  if (localeFromPathname(pathname) === DEFAULT_LOCALE) return pathname
  return mapFirstSegment(pathname.slice(3) || "/", HR_SEGMENTS)
}

/**
 * The same page in the other language, worked out from the path alone. Blog
 * posts have their own slug per language, so a post falls back to the blog
 * index; pages that know their translation say so with hreflang links, which
 * the language switcher checks first.
 */
export function switchLocalePath(pathname: string, target: Locale): string {
  const path = internalPath(pathname)
  return localePath(target, path.startsWith("/blog/") ? "/blog" : path)
}

/** Props of a page or layout under app/[lang]/. */
export interface LangProps {
  params: { lang: Locale }
}
