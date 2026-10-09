"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY = "ga_consent"

export default function CookieConsent() {
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
    <div className="cookie-banner" role="region" aria-label="Kolačići">
      <p className="cookie-banner__title">
        <span aria-hidden="true">🍪</span> Kolačići
      </p>
      <p className="cookie-banner__text">
        Koristimo analitičke kolačiće (Google Analytics) kako bismo vidjeli kako se stranica koristi. Podaci su anonimni
        i ne dijelimo ih u marketinške svrhe.{" "}
        <a href="/privatnost">Pravila privatnosti</a>
      </p>
      <div className="cookie-banner__actions">
        <button type="button" className="cookie-banner__decline" onClick={decline}>
          Odbij
        </button>
        <button type="button" className="cookie-banner__accept" onClick={accept}>
          Prihvati
        </button>
      </div>
    </div>
  )
}
