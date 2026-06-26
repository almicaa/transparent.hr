import Link from "next/link"
import { Job } from "../../lib/types"
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

export default function JobCard({ job }: { job: Job }) {
  const sourceLabel = SOURCE_LABELS[job.source || ""] || job.source || "unknown"
  const salaryDisplay = job.salary_shown
    ? cleanSalary(job.salary_text) || (job.salary_min ? `${job.salary_min} - ${job.salary_max}` : null)
    : null

  return (
    <article className="job">
      <div className="job__main">
        <h3 className="job__title">
          <Link href={`/jobs/${job.id}`}>{job.title}</Link>
        </h3>
        {job.company ? <div className="job__company">{job.company}</div> : null}
        {job.location ? <div className="job__location">{job.location}</div> : null}
        {salaryDisplay ? <div className="job__salary">{salaryDisplay}</div> : null}
        <div className="badge source-badge">{sourceLabel}</div>
      </div>

      <div className="job__footer">
        <div className="job__description">
          {job.description ? job.description.slice(0, 160) + (job.description.length > 160 ? "..." : "") : ""}
        </div>
      </div>

      <Link href={`/jobs/${job.id}`} className="job__corner-link">
        Detalji
      </Link>
    </article>
  )
}
