import Link from "next/link"
import { notFound } from "next/navigation"
import { getJob } from "../../../lib/api"
import { buildJobPostingJsonLd, jobDescription, SITE_URL } from "../../../lib/seo"
import { formatDate } from "../../../lib/format"
import NetCalculator from "../../../components/job/NetCalculator"
import ApplyLink from "../../../components/job/ApplyLink"
import { SOURCE_LABELS } from "../../../lib/sourceLabels"
import type { Metadata } from "next"

export const revalidate = 3600

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const job = await getJob(params.id, { revalidate: 3600 })
  if (!job) return { title: "Oglas nije pronađen" }

  const title = `${job.title}${job.company ? " — " + job.company : ""}`
  const description = job.salary_text || jobDescription(job).slice(0, 160)
  const url = `${SITE_URL}/jobs/${job.id}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Transparent.hr",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  }
}

function salaryComparisonText(pct: number, category: string, basis: string | null): string {
  // basis is "neto" / "bruto" — indeclinable, so it slots in as-is.
  const kind = basis ? `${basis} ` : ""
  if (Math.abs(pct) < 5) return `U rangu s tipičnom ${kind}plaćom u grani ${category}.`
  return `${Math.round(Math.abs(pct))}% ${pct > 0 ? "viša" : "niža"} od tipične ${kind}plaće u grani ${category}.`
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const job = await getJob(params.id, { revalidate: 3600 })
  if (!job) notFound()

  const jsonLd = buildJobPostingJsonLd(job)

  return (
    <main className="job-detail">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/jobs">← Svi oglasi</Link>

      <h1>{job.title}</h1>
      {job.company ? <div className="job-detail__company">{job.company}</div> : null}
      {job.location ? <div className="job-detail__location">{job.location}</div> : null}

      {job.salary_shown && job.salary_text ? (
        <div className="job-detail__pay">
          <div className="job-detail__salary">{job.salary_text}</div>
          <NetCalculator job={job} />
        </div>
      ) : null}

      {job.description ? <p className="job-detail__description">{job.description}</p> : null}

      {job.salary_vs_category !== null && job.category ? (
        <div className="job-detail__compare">{salaryComparisonText(job.salary_vs_category, job.category, job.salary_basis)}</div>
      ) : null}

      {job.expires_at ? (
        <div className="job-detail__deadline">Rok prijave: {formatDate(job.expires_at)}</div>
      ) : null}

      <div className="job__badges">
        {job.category ? (
          <div className="badge">{job.category}</div>
        ) : null}
        <div className="badge source-badge">{SOURCE_LABELS[job.source || ""] || job.source}</div>
      </div>

      {job.url ? (
        <p>
          <ApplyLink href={job.url} jobId={job.id} source={job.source} category={job.category} />
        </p>
      ) : null}
    </main>
  )
}
