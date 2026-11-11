import "../styles/globals.css"
import type { Metadata } from "next"
import Script from "next/script"
import Header from "../components/layout/Header"
import Footer from "../components/layout/Footer"
import CookieConsent from "../components/analytics/CookieConsent"
import { HOME_DESCRIPTION, HOME_TITLE, SITE_NAME, SITE_URL } from "../lib/seo"
import { getAllPosts } from "../lib/blog"

const GA_ID = "G-5PPM0Y3J1E"
const IS_PRODUCTION = process.env.NODE_ENV === "production"

// Fallbacks only (e.g. the 404 page). Every page sets its own title,
// description, canonical and share tags through pageMetadata() in lib/seo.ts;
// no url or title here, or a page that forgot would share as the homepage.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: HOME_TITLE, template: "%s | Transparent.hr" },
  description: HOME_DESCRIPTION,
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
    siteName: SITE_NAME,
    type: "website",
    locale: "hr_HR",
  },
  twitter: { card: "summary_large_image" },
  verification: {
    google: "kV1-7d8bJmasXX4KCWiXnRVvtEJAFiYkosLGNVp6sNQ",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Transparent.hr",
  url: SITE_URL,
  description: HOME_DESCRIPTION,
  inLanguage: "hr",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/jobs?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr">
      <head>
        {/* Inter is self-hosted (see globals.css); start the main file early. */}
        <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Production only, so local development doesn't count as visits. */}
        {IS_PRODUCTION ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', wait_for_update: 2000 });
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}</Script>
          </>
        ) : null}
        <Header showBlog={getAllPosts().length > 0} />
        <div className="container page-content">{children}</div>
        <Footer />
        <CookieConsent />
      </body>
    </html>
  )
}
