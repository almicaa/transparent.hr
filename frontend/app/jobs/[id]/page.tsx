import Link from "next/link"
import { notFound } from "next/navigation"
import { getJob } from "../../../lib/api"
import { buildJobPostingJsonLd, jobMetaDescription, jobMetaTitle, pageMetadata } from "../../../lib/seo"
import { formatDate } from "../../../lib/format"
import NetCalculator from "../../../components/job/NetCalculator"
import ApplyLink from "../../../components/job/ApplyLink"
import SaveButton from "../../../components/job/SaveButton"
import JobTitle from "../../../components/job/JobTitle"
import { SOURCE_LABELS } from "../../../lib/sourceLabels"
import type { Metadata } from "next"

export const revalidate = 3600

// No pages at build time; each job is rendered on its first visit and then
// cached for `revalidate`. Without this, Next 14 renders the route on every
// request (cache-control: no-store) despite `revalidate`.
export function generateStaticParams() {
  return []
}

/** The job for a route id, or null for unknown, expired and malformed ids
 * ("/jobs/abc" would otherwise reach the API, get a 422 and fail with a 500). */
async function loadJob(id: string) {
  if (!/^\d+$/.test(id)) return null
  return getJob(id, { revalidate: 3600 })
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const job = await loadJob(params.id)
  if (!job) return { title: "Oglas nije pronađen" }
  return pageMetadata({
    title: jobMetaTitle(job),
    description: jobMetaDescription(job),
    path: `/jobs/${job.id}`,
    ownImage: true,
  })
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const job = await loadJob(params.id)
  if (!job) notFound()

  const jsonLd = buildJobPostingJsonLd(job)

  return (
    <main className="job-detail">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/jobs">← Svi oglasi</Link>

      <h1>
        <JobTitle title={job.title} />
      </h1>
      {job.company ? <div className="job-detail__company">{job.company}</div> : null}
      {job.location ? <div className="job-detail__location">{job.location}</div> : null}

      {job.salary_shown && job.salary_text ? (
        <div className="job-detail__pay">
          <div className="job-detail__salary">
            {job.salary_text}
            {job.salary_period === "hour" ? " (po satu)" : job.salary_period === "year" ? " (godišnje)" : ""}
          </div>
          <NetCalculator job={job} />
        </div>
      ) : null}

      {job.description ? <p className="job-detail__description">{job.description}</p> : null}

      {job.expires_at ? (
        <div className="job-detail__deadline">Rok prijave: {formatDate(job.expires_at)}</div>
      ) : null}

      <div className="job__badges">
        {job.category ? (
          <div className="badge">{job.category}</div>
        ) : null}
        <div className="badge source-badge">{SOURCE_LABELS[job.source || ""] || job.source}</div>
      </div>

      <div className="job-detail__actions">
        {job.url ? <ApplyLink href={job.url} jobId={job.id} source={job.source} category={job.category} /> : null}
        <SaveButton job={job} withLabel />
      </div>
    </main>
  )
}
