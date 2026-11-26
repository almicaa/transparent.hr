import type { Metadata } from "next"
import { displayTitle, formatDate, salaryAmount } from "./format"
import { DEFAULT_LOCALE, Locale, LOCALES, localePath, OG_LOCALE } from "./i18n"
import { basisLabel } from "./labels"
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
export const HOME_TITLE: Record<Locale, string> = {
  hr: "Oglasi za posao s plaćom u Hrvatskoj | Transparent.hr",
  en: "Jobs in Croatia with the salary listed | Transparent.hr",
}
export const HOME_DESCRIPTION: Record<Locale, string> = {
  hr: "Svi oglasi za posao u Hrvatskoj s navedenom plaćom na jednom mjestu. Neto i bruto plaće u eurima s Posao.hr, MojPosao.hr i HZZ-a, po gradu, grani i iznosu.",
  en: "Every job ad in Croatia that lists the salary, in one place. Net and gross pay in euros from Posao.hr, MojPosao.hr and HZZ, by city, sector and amount.",
}

/** Absolute URL of a public path. */
export function absoluteUrl(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`
}

/** The site-wide share image, app/[lang]/opengraph-image.tsx. */
function defaultShareImage(locale: Locale) {
  return { url: absoluteUrl(localePath(locale, "/opengraph-image")), width: 1200, height: 630, alt: SITE_NAME }
}

interface PageMetadataInput {
  locale: Locale
  title: string
  description: string
  /** Internal (Croatian) path of the page ("/o-nama"); localized for the canonical link, og:url and hreflang. */
  path: string
  /** Public path per language, for pages whose translations don't share a path
   * (blog posts). A language left out has no translation and gets no hreflang link. */
  paths?: Partial<Record<Locale, string>>
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
 * Title, description, canonical link, hreflang alternates, Open Graph and
 * Twitter tags for a page.
 *
 * Every page uses this rather than its own `openGraph`: Next replaces the
 * layout's `openGraph` as a whole instead of merging it, so a page that set
 * only a title would otherwise share with the homepage's URL and title, or
 * lose its image.
 *
 * The hreflang links also tell the language switcher where this page's
 * translation lives.
 */
export function pageMetadata({
  locale,
  title,
  description,
  path,
  paths,
  type = "website",
  publishedTime,
  index = true,
  titleTemplate = true,
  ownImage = false,
}: PageMetadataInput): Metadata {
  const publicPaths: Partial<Record<Locale, string>> =
    paths ?? Object.fromEntries(LOCALES.map((l) => [l, localePath(l, path)]))
  const url = absoluteUrl(publicPaths[locale] ?? localePath(locale, path))
  const languages: Record<string, string> = {}
  for (const l of LOCALES) {
    const p = publicPaths[l]
    if (p) languages[l] = absoluteUrl(p)
  }
  // Only worth stating when there's a translation to point to.
  if (Object.keys(languages).length > 1 && languages[DEFAULT_LOCALE]) languages["x-default"] = languages[DEFAULT_LOCALE]
  const shareImage = defaultShareImage(locale)

  return {
    title: titleTemplate ? title : { absolute: title },
    description,
    alternates: { canonical: url, ...(Object.keys(languages).length > 1 ? { languages } : {}) },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      type,
      ...(publishedTime ? { publishedTime } : {}),
      ...(ownImage ? {} : { images: [shareImage] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ownImage ? {} : { images: [shareImage.url] }),
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

/** The pay as shown in a language: the ad's own (Croatian) text in Croatian,
 * "€1,200 – €1,400 net" worked out from the numbers in English. */
export function jobSalaryText(job: Job, locale: Locale): string | null {
  if (!job.salary_shown || !job.salary_text) return null
  if (locale === DEFAULT_LOCALE) return job.salary_text
  const amount = salaryAmount(job, locale)
  return amount && job.salary_basis ? `${amount} ${basisLabel(job.salary_basis, locale)}` : amount
}

/** Locations longer than this ("Zagreb (Ilica, Savica, Dubrava)") stay out of the title. */
const MAX_TITLE_LOCATION = 30

/** "Radnik/radnica na proizvodnoj liniji, Bobovica — 1050 € bruto" (the layout adds the brand).
 * The company is left to the description: names like "… d.o.o. za privremeno
 * zapošljavanje" push the title far past what search results show. */
export function jobMetaTitle(job: Job, locale: Locale = DEFAULT_LOCALE): string {
  let title = displayTitle(job.title)
  if (job.location && job.location.length <= MAX_TITLE_LOCATION) title += `, ${job.location}`
  const salary = jobSalaryText(job, locale)
  if (salary) title += ` — ${salary}`
  return title
}

/** "Prodavač. Plaća: 1050 € bruto. Lokacija: Split. Puno radno vrijeme. Rok prijave: 7. 11. 2026. Poslodavac: …"
 * The company goes last: its name is often long, and cutting it short loses
 * less than cutting the deadline. */
export function jobMetaDescription(job: Job, locale: Locale = DEFAULT_LOCALE): string {
  const t = locale === "en"
    ? { salary: "Salary", location: "Location", deadline: "Apply by", employer: "Employer" }
    : { salary: "Plaća", location: "Lokacija", deadline: "Rok prijave", employer: "Poslodavac" }
  const parts: string[] = []
  const salary = jobSalaryText(job, locale)
  if (salary) parts.push(`${t.salary}: ${salary}`)
  if (job.location) parts.push(`${t.location}: ${job.location}`)
  // The type comes from the ad in Croatian ("Puno radno vrijeme").
  if (job.job_type && locale === DEFAULT_LOCALE) parts.push(job.job_type)
  // formatDate ends with its own full stop ("7. 11. 2026."); the join adds one.
  if (job.expires_at) parts.push(`${t.deadline}: ${formatDate(job.expires_at, locale).replace(/\.$/, "")}`)
  if (job.company) parts.push(`${t.employer}: ${job.company}`)
  const text = `${displayTitle(job.title)}. ${parts.join(". ")}.`
  return text.length <= 160 ? text : `${text.slice(0, 157).replace(/\s+\S*$/, "")}…`
}

// Keep in sync with COUNTRY_KEYWORDS in shared/location_normalizer.py.
const COUNTRIES: { code: string; names: string[]; cities?: string[] }[] = [
  { code: "AT", names: ["austrija", "austria"] },
  { code: "DE", names: ["njemačka", "germany", "deutschland"], cities: ["berlin", "münchen"] },
  { code: "CH", names: ["švicarska", "switzerland"] },
  { code: "IT", names: ["italija", "italy"] },
  { code: "FR", names: ["francuska", "france"] },
  { code: "NL", names: ["nizozemska", "netherlands", "holland"] },
  { code: "BE", names: ["belgija", "belgium"] },
  { code: "HU", names: ["mađarska", "hungary"] },
  { code: "IE", names: ["irska", "ireland"] },
  { code: "SE", names: ["švedska", "sweden"] },
  { code: "NO", names: ["norveška", "norway"] },
  { code: "DK", names: ["danska", "denmark"] },
  { code: "GB", names: ["velika britanija", "united kingdom", "england"] },
  { code: "PL", names: ["poljska", "poland"] },
  { code: "CZ", names: ["češka", "czech"] },
  { code: "GR", names: ["grčka", "greece"] },
  { code: "ES", names: ["španjolska", "spain"] },
  { code: "MT", names: ["malta"] },
  { code: "CY", names: ["cipar", "cyprus"] },
  { code: "CA", names: ["kanada", "canada"] },
  { code: "AU", names: ["australija", "australia"] },
  { code: "SI", names: ["slovenija", "slovenia"] },
]

function place(addressCountry: string, addressLocality?: string) {
  return {
    "@type": "Place",
    address: { "@type": "PostalAddress", ...(addressLocality ? { addressLocality } : {}), addressCountry },
  }
}

/** Places for a free-text location: "Landsberg, Njemačka" is Landsberg in DE,
 * a bare "Austrija" just AT, and several countries one place each. */
export function jobPlaces(location: string) {
  const lower = location.toLowerCase()
  const found = COUNTRIES.filter((c) => [...c.names, ...(c.cities ?? [])].some((k) => lower.includes(k)))
  if (found.length === 0) return [place("HR", location)]
  if (found.length > 1) return found.map((c) => place(c.code))
  const locality = location
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !found[0].names.includes(part.toLowerCase()))
    .join(", ")
  return [place(found[0].code, locality)]
}

/** schema.org employmentType from the ad's "Puno radno vrijeme" or "20 sati tjedno". */
export function jobEmploymentType(jobType: string | null): "FULL_TIME" | "PART_TIME" | null {
  if (!jobType) return null
  if (/puno radno vrijeme/i.test(jobType)) return "FULL_TIME"
  const hours = jobType.match(/^(\d+)\s+sat/i)
  if (!hours) return null
  return Number(hours[1]) >= 40 ? "FULL_TIME" : "PART_TIME"
}

/** The ad's employer, or null when we only know the portal it came from. */
function jobEmployer(job: Job): string | null {
  const company = job.company?.trim()
  if (!company) return null
  const portals = Object.values(SOURCE_LABELS).map((name) => name.toLowerCase())
  return portals.includes(company.toLowerCase()) ? null : company
}

/** JobPosting markup, or null when the ad lacks a real employer or a location:
 * Google requires both, and a portal named as the employer breaks its guidelines. */
export function buildJobPostingJsonLd(job: Job) {
  const employer = jobEmployer(job)
  if (!employer || !job.location) return null

  const datePosted = job.posted_at || job.scraped_at || new Date().toISOString()
  const places = jobPlaces(job.location)
  const employmentType = jobEmploymentType(job.job_type)
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: jobDescription(job),
    datePosted,
    hiringOrganization: {
      "@type": "Organization",
      name: employer,
    },
    jobLocation: places.length === 1 ? places[0] : places,
    directApply: false,
    url: `${SITE_URL}/jobs/${job.id}`,
  }

  if (employmentType) {
    jsonLd.employmentType = employmentType
  }

  if (job.expires_at) {
    jsonLd.validThrough = job.expires_at
  }

  if (job.category) {
    jsonLd.industry = job.category
  }

  if (job.salary_shown && job.salary_min) {
    const unitText = job.salary_period === "hour" ? "HOUR" : job.salary_period === "year" ? "YEAR" : "MONTH"
    jsonLd.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.salary_currency || "EUR",
      // "do X €" only states a maximum, so don't claim X as the minimum too.
      value:
        job.salary_type === "up_to"
          ? { "@type": "QuantitativeValue", maxValue: job.salary_max ?? job.salary_min, unitText }
          : {
              "@type": "QuantitativeValue",
              minValue: job.salary_min,
              maxValue: job.salary_max ?? job.salary_min,
              unitText,
            },
    }
  }

  return jsonLd
}
