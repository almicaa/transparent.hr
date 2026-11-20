"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLocale } from "../i18n/LocaleProvider"
import { localePath } from "../../lib/i18n"

const COPY = {
  hr: {
    title: "Kolačići",
    text: "Koristimo analitičke kolačiće (Google Analytics) kako bismo vidjeli kako se stranica koristi. Podaci su anonimni i ne dijelimo ih u marketinške svrhe.",
    policy: "Pravila privatnosti",
    decline: "Odbij",
    accept: "Prihvati",
  },
  en: {
    title: "Cookies",
    text: "We use analytics cookies (Google Analytics) to see how the site is used. The data is anonymous and we don't share it for marketing.",
    policy: "Privacy policy",
    decline: "Decline",
    accept: "Accept",
  },
}

const STORAGE_KEY = "ga_consent"

export default function CookieConsent() {
  const locale = useLocale()
  const t = COPY[locale]
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as "granted" | "denied" | null
    if (stored) {
      updateGtag(stored)
    } else {
      setVisible(true)
    }
  }, [])

  function updateGtag(value: "granted" | "denied") {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("consent", "update", {
        analytics_storage: value,
        ad_storage: "denied",
      })
    }
  }

  function accept() {
    localStorage.setItem(STORAGE_KEY, "granted")
    setVisible(false)
    updateGtag("granted")
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, "denied")
    setVisible(false)
    updateGtag("denied")
  }

  if (!visible) return null

  return (
    <div className="cookie-banner" role="region" aria-label={t.title}>
      <p className="cookie-banner__title">
        <span aria-hidden="true">🍪</span> {t.title}
      </p>
      <p className="cookie-banner__text">
        {t.text} <Link href={localePath(locale, "/privatnost")}>{t.policy}</Link>
      </p>
      <div className="cookie-banner__actions">
        <button type="button" className="cookie-banner__decline" onClick={decline}>
          {t.decline}
        </button>
        <button type="button" className="cookie-banner__accept" onClick={accept}>
          {t.accept}
        </button>
      </div>
    </div>
  )
}
