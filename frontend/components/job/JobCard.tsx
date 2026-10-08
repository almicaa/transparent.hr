import Link from "next/link"
import { Job } from "../../lib/types"
import { categoryIcon, categoryShortLabel } from "../../lib/categories"
import { daysUntil, parseApiDate } from "../../lib/format"
import { SOURCE_LABELS } from "../../lib/sourceLabels"

function cleanSalary(s: string | null): string | null {
  if (!s) return s
  let t = String(s)
  t = t.replace(/<[^>]*>/g, "")
  t = t.replace(/&[^;\s]+;/g, "")
  const idxTra = t.search(/-\s*Tražimo/i)
  if (idxTra !== -1) t = t.slice(0, idxTra).trim()
  const dotIdx = t.indexOf(". ")
  if (dotIdx !== -1) {
    const after = t.charAt(dotIdx + 2)
    if (after && !/[0-9]/.test(after)) {
      t = t.slice(0, dotIdx).trim()
    }
  }
  return t.replace(/[.\s]+$/g, "").trim()
}

const NEW_WITHIN_HOURS = 24
const DEADLINE_SOON_DAYS = 7
// Within this many percent of the category median counts as "about typical".
const TYPICAL_BAND_PCT = 5

function deadlineLabel(days: number): string {
  if (days <= 0) return "Ističe danas"
  if (days === 1) return "Ističe sutra"
  return `Još ${days} dana`
}

function SalaryComparison({ job }: { job: Job }) {
  const pct = job.salary_vs_category
  if (pct === null || pct === undefined || !job.category) return null
  const basis = job.salary_basis ? `${job.salary_basis} ` : ""
  const title = `U usporedbi s medijanom ${basis}plaća u grani ${job.category}`
  if (Math.abs(pct) < TYPICAL_BAND_PCT) {
    return (
      <span className="job__compare" title={title}>
        ≈ prosjek grane
      </span>
    )
  }
  const above = pct > 0
  return (
    <span className={above ? "job__compare is-above" : "job__compare is-below"} title={title}>
      {above ? "▲" : "▼"} {Math.round(Math.abs(pct))}% {above ? "iznad" : "ispod"} prosjeka grane
    </span>
  )
}

export default function JobCard({ job }: { job: Job }) {
  const sourceLabel = SOURCE_LABELS[job.source || ""] || job.source || "unknown"
  const salaryDisplay = job.salary_shown
    ? cleanSalary(job.salary_text) || (job.salary_min ? `${job.salary_min} - ${job.salary_max}` : null)
    : null
  const isNew = job.scraped_at
    ? Date.now() - parseApiDate(job.scraped_at).getTime() < NEW_WITHIN_HOURS * 3_600_000
    : false
  const daysLeft = job.expires_at ? daysUntil(job.expires_at) : null
  const showDeadline = daysLeft !== null && daysLeft <= DEADLINE_SOON_DAYS

  return (
    <article className="job">
      {isNew || showDeadline ? (
        <div className="job__flags">
          {isNew ? <span className="flag flag--new">Novo</span> : null}
          {showDeadline ? (
            // Relative to "now", so a cached server render and the client can disagree by a day.
            <span className={daysLeft! <= 3 ? "flag flag--urgent" : "flag"} suppressHydrationWarning>
              {deadlineLabel(daysLeft!)}
            </span>
          ) : null}
        </div>
      ) : null}

      <h3 className="job__title">
        {/* The link covers the whole card (see .job__title a::after). */}
        <Link href={`/jobs/${job.id}`}>{job.title}</Link>
      </h3>
      <div className="job__meta">
        {[job.company, job.location].filter(Boolean).join(" · ")}
      </div>

      {salaryDisplay ? (
        <div className="job__pay">
          <div className="job__salary">{salaryDisplay}</div>
          <SalaryComparison job={job} />
        </div>
      ) : null}

      <div className="job__footer">
        {job.category ? (
          <span className="badge" title={job.category}>
            {categoryIcon(job.category)} {categoryShortLabel(job.category)}
          </span>
        ) : null}
        <span className="job__source">{sourceLabel}</span>
      </div>
    </article>
  )
}
