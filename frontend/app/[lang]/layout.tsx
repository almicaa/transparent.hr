import "../../styles/globals.css"
import type { Metadata } from "next"
import Script from "next/script"
import { notFound } from "next/navigation"
import Header from "../../components/layout/Header"
import Footer from "../../components/layout/Footer"
import CookieConsent from "../../components/analytics/CookieConsent"
import { LocaleProvider } from "../../components/i18n/LocaleProvider"
import { HOME_DESCRIPTION, HOME_TITLE, SITE_NAME, SITE_URL } from "../../lib/seo"
import { getAllPosts } from "../../lib/blog"
import { isLocale, Locale, LOCALES, localePath, OG_LOCALE } from "../../lib/i18n"

const GA_ID = "G-5PPM0Y3J1E"
const IS_PRODUCTION = process.env.NODE_ENV === "production"

// Both languages are prerendered. No `dynamicParams = false` here: layouts pass
// it down, and it would 404 every job page (rendered on first visit). An
// unknown language can't get here anyway, middleware only rewrites to hr/en,
// and the layout's isLocale check catches the rest.
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }))
}

const KEYWORDS: Record<Locale, string[]> = {
  hr: [
    "transparentna plaća",
    "oglasi s plaćom",
    "posao s plaćom",
    "transparentno hr",
    "poslovi s navedenom plaćom",
    "posao Hrvatska",
    "oglasi za posao",
    "bruto neto plaća",
  ],
  en: [
    "jobs in Croatia",
    "Croatia jobs with salary",
    "salary transparency Croatia",
    "jobs in Zagreb",
    "net gross salary Croatia",
  ],
}

// Fallbacks only (e.g. the 404 page). Every page sets its own title,
// description, canonical and share tags through pageMetadata() in lib/seo.ts;
// no url or title here, or a page that forgot would share as the homepage.
export function generateMetadata({ params }: { params: { lang: Locale } }): Metadata {
  const locale = params.lang
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: HOME_TITLE[locale], template: "%s | Transparent.hr" },
    description: HOME_DESCRIPTION[locale],
    keywords: KEYWORDS[locale],
    openGraph: {
      siteName: SITE_NAME,
      type: "website",
      locale: OG_LOCALE[locale],
    },
    twitter: { card: "summary_large_image" },
    verification: {
      google: "kV1-7d8bJmasXX4KCWiXnRVvtEJAFiYkosLGNVp6sNQ",
    },
  }
}

export default function RootLayout({ children, params }: { children: React.ReactNode; params: { lang: string } }) {
  if (!isLocale(params.lang)) notFound()
  const locale = params.lang
  const home = localePath(locale, "/")

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Transparent.hr",
    url: home === "/" ? SITE_URL : `${SITE_URL}${home}`,
    description: HOME_DESCRIPTION[locale],
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}${localePath(locale, "/jobs")}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  }

  return (
    <html lang={locale}>
      <head>
        {/* Inter is self-hosted (see globals.css); start the main file early. */}
        <link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
        <LocaleProvider locale={locale}>
          <Header showBlog={getAllPosts(locale).length > 0} />
          <div className="container page-content">{children}</div>
          <Footer locale={locale} />
          <CookieConsent />
        </LocaleProvider>
      </body>
    </html>
  )
}
