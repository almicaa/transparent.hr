import Link from "next/link"
import { notFound } from "next/navigation"
import { getJob } from "../../../lib/api"
import { buildJobPostingJsonLd, jobDescription, SITE_URL } from "../../../lib/seo"
import { SOURCE_LABELS } from "../../../lib/sourceLabels"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const job = await getJob(params.id)
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

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const job = await getJob(params.id)
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
        <div className="job-detail__salary">{job.salary_text}</div>
      ) : null}

      {job.description ? <p className="job-detail__description">{job.description}</p> : null}

      <div className="badge source-badge">{SOURCE_LABELS[job.source || ""] || job.source}</div>

      {job.url ? (
        <p>
          <a href={job.url} target="_blank" rel="noreferrer">
            Pogledaj originalni oglas →
          </a>
        </p>
      ) : null}
    </main>
  )
}
