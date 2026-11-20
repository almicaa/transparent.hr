"use client"

import { usePathname, useRouter } from "next/navigation"
import { useLocale } from "../i18n/LocaleProvider"
import { Locale, LOCALE_COOKIE, LOCALES, switchLocalePath } from "../../lib/i18n"

const NAMES: Record<Locale, string> = { hr: "Hrvatski", en: "English" }

/** Where this page lives in `target`: its hreflang link when it has one (a blog
 * post's translation has its own slug), otherwise worked out from the path. */
function targetPath(pathname: string, target: Locale): string {
  const link = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${target}"]`)
  if (link) {
    try {
      return new URL(link.href).pathname
    } catch {}
  }
  return switchLocalePath(pathname, target)
}

export default function LanguageSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  function change(target: Locale) {
    if (target === locale) return
    // Remembered so links to Croatian URLs (shared, bookmarked) open in English for this visitor.
    document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=31536000; samesite=lax`
    // Keep the job list's filters (?grana=…).
    router.push(targetPath(pathname, target) + window.location.search)
  }

  return (
    <label className="lang-switch">
      <span className="sr-only">{locale === "en" ? "Language" : "Jezik"}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" stroke="currentColor" strokeWidth="1.8" />
      </svg>
      {/* The pill shows the short code; the select, invisible on top of it,
          opens the native list with the full names. */}
      <span className="lang-switch__code" aria-hidden="true">
        {locale.toUpperCase()}
      </span>
      <select value={locale} onChange={(e) => change(e.target.value as Locale)}>
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l}>
            {NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  )
}
