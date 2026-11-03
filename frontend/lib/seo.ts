import type { Metadata } from "next"
import { displayTitle, formatDate } from "./format"
import { Job } from "./types"
import { SOURCE_LABELS } from "./sourceLabels"

// The public address used in canonical links, the sitemap, robots.txt and
// structured data. Defaults to production so a missing env var can never
// tell Google the site lives on localhost.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.transparent.hr").replace(/\/$/, "")
export const SITE_NAME = "Transparent.hr"
/** Public contact address (O nama, footer). */
export const CONTACT_EMAIL = "info@transparent.hr"

// Leads with the phrase people actually search for; the brand goes last.
export const HOME_TITLE = "Oglasi za posao s plaćom u Hrvatskoj | Transparent.hr"
export const HOME_DESCRIPTION =
  "Svi oglasi za posao u Hrvatskoj s navedenom plaćom na jednom mjestu. Neto i bruto plaće u eurima s Posao.hr, MojPosao.hr i HZZ-a, po gradu, grani i iznosu."

/** The site-wide share image, app/opengraph-image.tsx. */
const DEFAULT_SHARE_IMAGE = { url: `${SITE_URL}/opengraph-image`, width: 1200, height: 630, alt: SITE_NAME }

interface PageMetadataInput {
  title: string
  description: string
  /** Path of the page ("/o-nama"); used for the canonical link and og:url. */
  path: string
  type?: "website" | "article"
  publishedTime?: string
  /** Set false for pages that shouldn't be indexed (still followed). */
  index?: boolean
  /** When false, the title is used as-is instead of getting the " | Transparent.hr" suffix. */
  titleTemplate?: boolean
  /** True when the route has its own opengraph-image.tsx; an explicit image here would replace it. */
  ownImage?: boolean
}

/**
 * Title, description, canonical link, Open Graph and Twitter tags for a page.
 *
 * Every page uses this rather than its own `openGraph`: Next replaces the
 * layout's `openGraph` as a whole instead of merging it, so a page that set
 * only a title would otherwise share with the homepage's URL and title, or
 * lose its image.
 */
export function pageMetadata({
  title,
  description,
  path,
  type = "website",
  publishedTime,
  index = true,
  titleTemplate = true,
  ownImage = false,
}: PageMetadataInput): Metadata {
  const url = path === "/" ? SITE_URL : `${SITE_URL}${path}`
  return {
    title: titleTemplate ? title : { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "hr_HR",
      type,
      ...(publishedTime ? { publishedTime } : {}),
      ...(ownImage ? {} : { images: [DEFAULT_SHARE_IMAGE] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ownImage ? {} : { images: [DEFAULT_SHARE_IMAGE.url] }),
    },
    ...(index ? {} : { robots: { index: false, follow: true } }),
  }
}

/**
 * The scraper doesn't reliably capture a real description or company name
 * yet (both are NULL for every job right now), so Google JobPosting rich
 * results would otherwise be missing required fields. We synthesize a
 * reasonable fallback from what we do have rather than omit the markup
 * entirely — quality improves automatically once the scraper extracts more.
 */
export function jobDescription(job: Job): string {
  if (job.description) return job.description
  const parts = [job.title]
  if (job.location) parts.push(`Lokacija: ${job.location}`)
  if (job.salary_text) parts.push(`Plaća: ${job.salary_text}`)
  parts.push(`Izvor: ${SOURCE_LABELS[job.source || ""] || job.source || "nepoznat portal"}`)
  return parts.join(". ")
}

/** Locations longer than this ("Zagreb (Ilica, Savica, Dubrava)") stay out of the title. */
const MAX_TITLE_LOCATION = 30

/** "Radnik/radnica na proizvodnoj liniji, Bobovica — 1050 € bruto" (the layout adds the brand).
 * The company is left to the description: names like "… d.o.o. za privremeno
 * zapošljavanje" push the title far past what search results show. */
export function jobMetaTitle(job: Job): string {
  let title = displayTitle(job.title)
  if (job.location && job.location.length <= MAX_TITLE_LOCATION) title += `, ${job.location}`
  if (job.salary_shown && job.salary_text) title += ` — ${job.salary_text}`
  return title
}

/** "Prodavač. Plaća: 1050 € bruto. Lokacija: Split. Puno radno vrijeme. Rok prijave: 7. 11. 2026. Poslodavac: …"
 * The company goes last: its name is often long, and cutting it short loses
 * less than cutting the deadline. */
export function jobMetaDescription(job: Job): string {
  const parts: string[] = []
  if (job.salary_shown && job.salary_text) parts.push(`Plaća: ${job.salary_text}`)
  if (job.location) parts.push(`Lokacija: ${job.location}`)
  if (job.job_type) parts.push(job.job_type)
  // formatDate ends with its own full stop ("7. 11. 2026."); the join adds one.
  if (job.expires_at) parts.push(`Rok prijave: ${formatDate(job.expires_at).replace(/\.$/, "")}`)
  if (job.company) parts.push(`Poslodavac: ${job.company}`)
  const text = `${displayTitle(job.title)}. ${parts.join(". ")}.`
  return text.length <= 160 ? text : `${text.slice(0, 157).replace(/\s+\S*$/, "")}…`
}

export function jobOrganizationName(job: Job): string {
  return job.company || SOURCE_LABELS[job.source || ""] || job.source || SITE_NAME
}

export function buildJobPostingJsonLd(job: Job) {
  const datePosted = job.posted_at || job.scraped_at || new Date().toISOString()
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: jobDescription(job),
    datePosted,
    hiringOrganization: {
      "@type": "Organization",
      name: jobOrganizationName(job),
    },
    directApply: false,
    url: `${SITE_URL}/jobs/${job.id}`,
  }

  if (job.location) {
    jsonLd.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
        addressCountry: "HR",
      },
    }
  }

  if (job.expires_at) {
    jsonLd.validThrough = job.expires_at
  }

  if (job.category) {
    jsonLd.industry = job.category
  }

  if (job.salary_shown && job.salary_min) {
    jsonLd.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.salary_currency || "EUR",
      value: {
        "@type": "QuantitativeValue",
        minValue: job.salary_min,
        maxValue: job.salary_max ?? job.salary_min,
        unitText: "MONTH",
      },
    }
  }

  return jsonLd
}
