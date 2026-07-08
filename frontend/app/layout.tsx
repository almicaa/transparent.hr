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

const title = "Transparent.hr — Oglasi za posao s transparentnom plaćom u Hrvatskoj"
const description =
  "Pronađi posao s vidljivom plaćom u Hrvatskoj. Oglasi s transparentno navedenom neto i bruto plaćom u EUR — filtrirano s posao.hr, mojposao.hr i ostalih portala."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: "%s | Transparent.hr" },
  description,
  keywords: [
    "transparentna plaća",
    "oglasi s plaćom",
    "posao s plaćom",
    "transparentno hr",
    "poslovi s navedenom plaćom",
    "posao Hrvatska",
    "oglasi za posao",
    "bruto neto plaća",
  ],
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
  verification: {
    google: "kV1-7d8bJmasXX4KCWiXnRVvtEJAFiYkosLGNVp6sNQ",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Transparent.hr",
  url: SITE_URL,
  description,
  inLanguage: "hr",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/jobs?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr" className={inter.variable}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
