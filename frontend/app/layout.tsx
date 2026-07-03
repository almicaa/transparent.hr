import "../styles/globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import Header from "../components/layout/Header"
import Footer from "../components/layout/Footer"
import CookieConsent from "../components/analytics/CookieConsent"
import { SITE_URL } from "../lib/seo"

const GA_ID = "G-K4GM301ZJJ"

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" })

const title = "Transparent.hr — poslovi s vidljivom plaćom"
const description = "Pretraži oglase za posao u Hrvatskoj koji otvoreno prikazuju plaću u EUR."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: "%s | Transparent.hr" },
  description,
  openGraph: {
    title,
    description,
    url: SITE_URL,
    siteName: "Transparent.hr",
    type: "website",
    locale: "hr_HR",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr" className={inter.variable}>
      <body>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', wait_for_update: 2000 });
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}</Script>
        <Header />
        <div className="container page-content">{children}</div>
        <Footer />
        <CookieConsent />
      </body>
    </html>
  )
}
