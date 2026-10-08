import Link from "next/link"
import { Job } from "../../lib/types"
import { daysUntil, formatDate, parseApiDate } from "../../lib/format"
import NetCalculator from "./NetCalculator"

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

// Matches NEW_JOB_DAYS in the backend ("Samo novi" filter).
const NEW_WITHIN_DAYS = 3
// At or below this many days left, the deadline turns into a red countdown.
const URGENT_DAYS = 3

function amount(n: number): string {
  return Math.round(n).toLocaleString("hr-HR")
}

/** "1.100 – 1.500 €", "od 2.000 €", "1.400 €" from the parsed numbers; falls back to the ad's own text. */
function salaryAmount(job: Job): string | null {
  const { salary_min: lo, salary_max: hi } = job
  if (lo === null) return job.salary_shown ? cleanSalary(job.salary_text) : null
  if (job.salary_type === "from" || job.salary_type === "above") return `od ${amount(lo)} €`
  if (hi === null || hi === lo) return `${amount(lo)} €`
  return `${amount(lo)} – ${amount(hi)} €`
}

function Deadline({ expiresAt }: { expiresAt: string }) {
  const days = daysUntil(expiresAt)
  if (days <= URGENT_DAYS) {
    const text = days <= 0 ? "Ističe danas" : days === 1 ? "Ističe sutra" : `Još ${days} dana`
    // Relative to "now", so a cached server render and the client can disagree by a day.
    return (
      <span className="job__deadline is-urgent" suppressHydrationWarning>
        {text}
      </span>
    )
  }
  // "17. 10." — the year is noise on a card; the detail page has the full date.
  return <span className="job__deadline">Rok {formatDate(expiresAt).replace(/\s*\d{4}\.$/, "")}</span>
}

export default function JobCard({ job }: { job: Job }) {
  const pay = salaryAmount(job)
  const isNew = job.scraped_at
    ? Date.now() - parseApiDate(job.scraped_at).getTime() < NEW_WITHIN_DAYS * 86_400_000
    : false

  return (
    <article className="job">
      <h3 className="job__title">
        {/* The link covers the whole card (see .job__title a::after). */}
        <Link href={`/jobs/${job.id}`}>{job.title}</Link>
      </h3>
      <div className="job__org">{[job.company, job.location].filter(Boolean).join(" · ")}</div>
      {pay ? (
        <div className="job__pay">
          <span className="job__amount">{pay}</span>
          {job.salary_basis ? <span className="job__basis">{job.salary_basis}</span> : null}
          <NetCalculator job={job} />
        </div>
      ) : null}
      {isNew || job.expires_at ? (
        <div className="job__foot">
          {isNew ? <span className="job__new">Novo</span> : <span />}
          {job.expires_at ? <Deadline expiresAt={job.expires_at} /> : null}
        </div>
      ) : null}
    </article>
  )
}
