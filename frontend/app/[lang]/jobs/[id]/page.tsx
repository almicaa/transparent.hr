import Link from "next/link"
import { notFound } from "next/navigation"
import { getJob } from "../../../../lib/api"
import {
  buildJobPostingJsonLd,
  jobMetaDescription,
  jobMetaTitle,
  jobSalaryText,
  pageMetadata,
} from "../../../../lib/seo"
import { formatDate } from "../../../../lib/format"
import { Locale, localePath } from "../../../../lib/i18n"
import { categoryLabel } from "../../../../lib/labels"
import SalaryBasis from "../../../../components/job/SalaryBasis"
import NetCalculator from "../../../../components/job/NetCalculator"
import ApplyLink from "../../../../components/job/ApplyLink"
import SaveButton from "../../../../components/job/SaveButton"
import JobTitle from "../../../../components/job/JobTitle"
import { SOURCE_LABELS } from "../../../../lib/sourceLabels"
import type { Metadata } from "next"

export const revalidate = 3600

// No pages at build time; each job is rendered on its first visit and then
// cached for `revalidate`. Without this, Next 14 renders the route on every
// request (cache-control: no-store) despite `revalidate`.
export function generateStaticParams() {
  return []
}

type Props = { params: { lang: Locale; id: string } }

const COPY = {
  hr: {
    notFound: "Oglas nije pronađen",
    back: "← Svi oglasi",
    perHour: " (po satu)",
    perYear: " (godišnje)",
    deadline: "Rok prijave",
    // The ad itself stays in the language it was posted in.
    originalLanguage: null,
  },
  en: {
    notFound: "Job not found",
    back: "← All jobs",
    perHour: " (per hour)",
    perYear: " (per year)",
    deadline: "Apply by",
    originalLanguage: "The ad is shown as posted, in Croatian.",
  },
}

/** The job for a route id, or null for unknown, expired and malformed ids
 * ("/jobs/abc" would otherwise reach the API, get a 422 and fail with a 500). */
async function loadJob(id: string) {
  if (!/^\d+$/.test(id)) return null
  return getJob(id, { revalidate: 3600 })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const job = await loadJob(params.id)
  if (!job) return { title: COPY[params.lang].notFound }
  return pageMetadata({
    locale: params.lang,
    title: jobMetaTitle(job, params.lang),
    description: jobMetaDescription(job, params.lang),
    path: `/jobs/${job.id}`,
    // The English page shows the same Croatian ad, so only the Croatian one is
    // indexed. No hreflang either: it must not point at a noindex page.
    paths: { [params.lang]: localePath(params.lang, `/jobs/${job.id}`) },
    index: params.lang === "hr",
    ownImage: true,
  })
}

export default async function JobDetailPage({ params }: Props) {
  const locale = params.lang
  const t = COPY[locale]
  const job = await loadJob(params.id)
  if (!job) notFound()

  // Google for Jobs gets each posting once, from the Croatian page (the ad's own language).
  const jsonLd = locale === "hr" ? buildJobPostingJsonLd(job) : null
  const salary = jobSalaryText(job, locale)
  // In Croatian the ad's own text often says neto/bruto already; the English text always does when it's known.
  const showBasis = locale === "hr" ? !/neto|bruto/i.test(job.salary_text ?? "") : !job.salary_basis

  return (
    <main className="job-detail">
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /> : null}

      <Link href={localePath(locale, "/jobs")}>{t.back}</Link>

      <h1>
        <JobTitle title={job.title} />
      </h1>
      {job.company ? <div className="job-detail__company">{job.company}</div> : null}
      {job.location ? <div className="job-detail__location">{job.location}</div> : null}

      {salary ? (
        <div className="job-detail__pay">
          <div className="job-detail__salary">
            {salary}
            {locale === "hr" ? (job.salary_period === "hour" ? t.perHour : job.salary_period === "year" ? t.perYear : "") : null}
            {showBasis ? <SalaryBasis job={job} locale={locale} /> : null}
          </div>
          <NetCalculator job={job} />
        </div>
      ) : null}

      {job.description ? (
        <p className="job-detail__description" lang="hr">
          {job.description}
        </p>
      ) : null}

      {job.expires_at ? (
        <div className="job-detail__deadline">
          {t.deadline}: {formatDate(job.expires_at, locale)}
        </div>
      ) : null}

      <div className="job__badges">
        {job.category ? <div className="badge">{categoryLabel(job.category, locale)}</div> : null}
        <div className="badge source-badge">{SOURCE_LABELS[job.source || ""] || job.source}</div>
      </div>

      {t.originalLanguage ? <p className="meta">{t.originalLanguage}</p> : null}

      <div className="job-detail__actions">
        {job.url ? <ApplyLink href={job.url} jobId={job.id} source={job.source} category={job.category} /> : null}
        <SaveButton job={job} withLabel />
      </div>
    </main>
  )
}
