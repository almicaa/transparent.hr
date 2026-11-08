import Link from "next/link"
import { Job } from "../../lib/types"
import { daysUntil, formatDate, parseApiDate } from "../../lib/format"
import JobTitle from "./JobTitle"
import SalaryBasis from "./SalaryBasis"
import NetCalculator from "./NetCalculator"
import SaveButton from "./SaveButton"
import { PinIcon } from "../ui/icons"

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

const PERIOD_SUFFIX: Record<string, string> = { hour: "/h", year: "/god." }

/** "1.100 – 1.500 €", "od 2.000 €", "3 – 4 €/h" from the parsed numbers; falls back to the ad's own text. */
function salaryAmount(job: Job): string | null {
  const { salary_min: lo, salary_max: hi } = job
  if (lo === null) return job.salary_shown ? cleanSalary(job.salary_text) : null
  const unit = `€${PERIOD_SUFFIX[job.salary_period ?? ""] ?? ""}`
  if (job.salary_type === "from" || job.salary_type === "above") return `od ${amount(lo)} ${unit}`
  if (job.salary_type === "up_to") return `do ${amount(hi ?? lo)} ${unit}`
  if (hi === null || hi === lo) return `${amount(lo)} ${unit}`
  return `${amount(lo)} – ${amount(hi)} ${unit}`
}

// How many city names to spell out on a grouped card before "i još N".
const SHOWN_PLACES = 3

/** 1 lokacija, 2–4 lokacije, 5+ lokacija (21 lokacija, 22 lokacije …). */
function locationsWord(n: number): string {
  const last = n % 10
  const lastTwo = n % 100
  if (last === 1 && lastTwo !== 11) return "lokacija"
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "lokacije"
  return "lokacija"
}

/** "28 lokacija: Buzet, Delnice, Jastrebarsko i još 25" for a grouped card. */
function placesLabel(places: string[] | null | undefined): string | null {
  if (!places || places.length < 2) return null
  const shown = places.slice(0, SHOWN_PLACES).join(", ")
  const rest = places.length - SHOWN_PLACES
  return `${places.length} ${locationsWord(places.length)}: ${shown}${rest > 0 ? ` i još ${rest}` : ""}`
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
  const groupedPlaces = placesLabel(job.group_locations)
  const isNew = job.scraped_at
    ? Date.now() - parseApiDate(job.scraped_at).getTime() < NEW_WITHIN_DAYS * 86_400_000
    : false

  return (
    <article className="job">
      <SaveButton job={job} />
      <h3 className="job__title">
        {/* The link covers the whole card (see .job__title a::after). */}
        <Link href={`/jobs/${job.id}`}>
          <JobTitle title={job.title} />
        </Link>
      </h3>
      {job.company ? <div className="job__org">{job.company}</div> : null}
      {groupedPlaces || job.location ? (
        <div className="job__loc">
          <PinIcon />
          <span>{groupedPlaces ?? job.location}</span>
        </div>
      ) : null}
      {pay ? (
        <div className="job__pay">
          <span className="job__amount">{pay}</span>
          <SalaryBasis job={job} />
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
