"use client"

import { createContext, useContext } from "react"
import { DEFAULT_LOCALE, Locale } from "../../lib/i18n"

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE)

/** Makes the page's language available to client components (set once in the layout). */
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}

export function useLocale(): Locale {
  return useContext(LocaleContext)
}
