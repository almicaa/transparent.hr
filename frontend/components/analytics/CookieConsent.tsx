"use client"

import { useEffect, useState } from "react"
import Script from "next/script"

const GA_ID = "G-K4GM301ZJJ"
const STORAGE_KEY = "ga_consent"

export default function CookieConsent() {
  const [consent, setConsent] = useState<"granted" | "denied" | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as "granted" | "denied" | null
    if (stored) {
      setConsent(stored)
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
    setConsent("granted")
    setVisible(false)
    updateGtag("granted")
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, "denied")
    setConsent("denied")
    setVisible(false)
    updateGtag("denied")
  }

  return (
    <>
      {/* GA script always present — consent mode controls data collection */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('consent', 'default', {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          wait_for_update: 2000
        });
        gtag('js', new Date());
        gtag('config', '${GA_ID}');
      `}</Script>

      {visible && (
        <div className="cookie-banner">
          <p className="cookie-banner__text">
            Koristimo Google Analytics kako bismo razumjeli kako posjetitelji koriste stranicu. Podaci su anonimni.{" "}
            <a href="/privatnost">Više o privatnosti</a>
          </p>
          <div className="cookie-banner__actions">
            <button className="cookie-banner__accept" onClick={accept}>Prihvati</button>
            <button className="cookie-banner__decline" onClick={decline}>Odbij</button>
          </div>
        </div>
      )}
    </>
  )
}
