import { Job } from "./types"
import { SOURCE_LABELS } from "./sourceLabels"

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
export const SITE_NAME = "Transparent.hr"
/** Public contact address (O nama, footer). */
export const CONTACT_EMAIL = "info@transparent.hr"

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
