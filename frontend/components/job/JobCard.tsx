import Link from "next/link"
import { Job } from "../../lib/types"
import { daysUntil, formatShortDate, parseApiDate, salaryAmount } from "../../lib/format"
import { Locale, localePath } from "../../lib/i18n"
import { useLocale } from "../i18n/LocaleProvider"
import JobTitle from "./JobTitle"
import SalaryBasis from "./SalaryBasis"
import NetCalculator from "./NetCalculator"
import SaveButton from "./SaveButton"
import { PinIcon } from "../ui/icons"

// Matches NEW_JOB_DAYS in the backend ("Samo novi" filter).
const NEW_WITHIN_DAYS = 3
// At or below this many days left, the deadline turns into a red countdown.
const URGENT_DAYS = 3

// How many city names to spell out on a grouped card before "i još N".
const SHOWN_PLACES = 3

const COPY = {
  hr: {
    andMore: (n: number) => ` i još ${n}`,
    today: "Ističe danas",
    tomorrow: "Ističe sutra",
    daysLeft: (n: number) => `Još ${n} dana`,
    deadline: "Rok",
    isNew: "Novo",
  },
  en: {
    andMore: (n: number) => ` and ${n} more`,
    today: "Closes today",
    tomorrow: "Closes tomorrow",
    daysLeft: (n: number) => `${n} days left`,
    deadline: "Apply by",
    isNew: "New",
  },
}

/** 1 lokacija, 2–4 lokacije, 5+ lokacija (21 lokacija, 22 lokacije …) / "locations". */
function locationsWord(n: number, locale: Locale): string {
  if (locale === "en") return n === 1 ? "location" : "locations"
  const last = n % 10
  const lastTwo = n % 100
  if (last === 1 && lastTwo !== 11) return "lokacija"
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "lokacije"
  return "lokacija"
}

/** "28 lokacija: Buzet, Delnice, Jastrebarsko i još 25" for a grouped card. */
function placesLabel(places: string[] | null | undefined, locale: Locale): string | null {
  if (!places || places.length < 2) return null
  const shown = places.slice(0, SHOWN_PLACES).join(", ")
  const rest = places.length - SHOWN_PLACES
  return `${places.length} ${locationsWord(places.length, locale)}: ${shown}${rest > 0 ? COPY[locale].andMore(rest) : ""}`
}

function Deadline({ expiresAt, locale }: { expiresAt: string; locale: Locale }) {
  const t = COPY[locale]
  const days = daysUntil(expiresAt)
  if (days <= URGENT_DAYS) {
    const text = days <= 0 ? t.today : days === 1 ? t.tomorrow : t.daysLeft(days)
    // Relative to "now", so a cached server render and the client can disagree by a day.
    return (
      <span className="job__deadline is-urgent" suppressHydrationWarning>
        {text}
      </span>
    )
  }
  // "17. 10." — the year is noise on a card; the detail page has the full date.
  return (
    <span className="job__deadline">
      {t.deadline} {formatShortDate(expiresAt, locale)}
    </span>
  )
}

export default function JobCard({ job }: { job: Job }) {
  const locale = useLocale()
  const pay = salaryAmount(job, locale)
  const groupedPlaces = placesLabel(job.group_locations, locale)
  const isNew = job.scraped_at
    ? Date.now() - parseApiDate(job.scraped_at).getTime() < NEW_WITHIN_DAYS * 86_400_000
    : false

  return (
    <article className="job">
      <SaveButton job={job} />
      <h3 className="job__title">
        {/* The link covers the whole card (see .job__title a::after). */}
        <Link href={localePath(locale, `/jobs/${job.id}`)}>
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
          <SalaryBasis job={job} locale={locale} />
          <NetCalculator job={job} />
        </div>
      ) : null}
      {isNew || job.expires_at ? (
        <div className="job__foot">
          {isNew ? <span className="job__new">{COPY[locale].isNew}</span> : <span />}
          {job.expires_at ? <Deadline expiresAt={job.expires_at} locale={locale} /> : null}
        </div>
      ) : null}
    </article>
  )
}
