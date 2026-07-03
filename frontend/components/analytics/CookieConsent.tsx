"use client"

import { useEffect, useState } from "react"
import Script from "next/script"

const GA_ID = "G-K4GM301ZJJ"
const STORAGE_KEY = "ga_consent"

export default function CookieConsent() {
  const [consent, setConsent] = useState<"granted" | "denied" | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "granted" || stored === "denied") {
      setConsent(stored as "granted" | "denied")
    } else {
      setVisible(true)
    }
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, "granted")
    setConsent("granted")
    setVisible(false)
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, "denied")
    setConsent("denied")
    setVisible(false)
  }

  return (
    <>
      {consent === "granted" && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}</Script>
        </>
      )}

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
