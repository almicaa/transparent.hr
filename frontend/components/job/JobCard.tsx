import Link from "next/link"
import { Job } from "../../lib/types"
import { daysUntil, formatDate, parseApiDate } from "../../lib/format"

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

// Matches NEW_JOB_DAYS in the backend ("Samo novi oglasi").
const NEW_WITHIN_DAYS = 3
// Below this many days left, the deadline line turns into a red countdown.
const URGENT_DAYS = 3

function DeadlineLine({ expiresAt }: { expiresAt: string }) {
  const days = daysUntil(expiresAt)
  if (days <= URGENT_DAYS) {
    const text = days <= 0 ? "Prijava ističe danas" : days === 1 ? "Prijava ističe sutra" : `Prijava ističe za ${days} dana`
    return (
      // Relative to "now", so a cached server render and the client can disagree by a day.
      <div className="job__deadline is-urgent" suppressHydrationWarning>
        {text}
      </div>
    )
  }
  return (
    <div className="job__deadline">
      Prijava do <strong>{formatDate(expiresAt)}</strong>
    </div>
  )
}

export default function JobCard({ job }: { job: Job }) {
  const salaryDisplay = job.salary_shown
    ? cleanSalary(job.salary_text) || (job.salary_min ? `${job.salary_min} - ${job.salary_max}` : null)
    : null
  const isNew = job.scraped_at
    ? Date.now() - parseApiDate(job.scraped_at).getTime() < NEW_WITHIN_DAYS * 86_400_000
    : false

  return (
    <article className="job">
      {isNew ? <span className="job__new">Novi oglas</span> : null}
      <h3 className="job__title">
        {/* The link covers the whole card (see .job__title a::after). */}
        <Link href={`/jobs/${job.id}`}>{job.title}</Link>
      </h3>
      {job.company ? <div className="job__company">{job.company}</div> : null}
      {job.location ? <div className="job__location">{job.location}</div> : null}
      {salaryDisplay ? <div className="job__salary">{salaryDisplay}</div> : null}
      {job.expires_at ? <DeadlineLine expiresAt={job.expires_at} /> : null}
    </article>
  )
}
