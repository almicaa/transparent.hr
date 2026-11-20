import { DEFAULT_LOCALE, INTL_LOCALE, Locale } from "./i18n"
import { Job } from "./types"

/** "1.500" in Croatian, "1,500" in English. */
export function formatNumber(n: number, locale: Locale = DEFAULT_LOCALE): string {
  return n.toLocaleString(INTL_LOCALE[locale])
}

/** "1.500 €" in Croatian, "€1,500" in English. */
export function euro(n: number, locale: Locale = DEFAULT_LOCALE): string {
  const amount = formatNumber(Math.round(n), locale)
  return locale === "en" ? `€${amount}` : `${amount} €`
}

/** "1 oglas", "3 oglasa", "11 oglasa", "21 oglas" / "1 job", "3 jobs" */
export function jobCountLabel(n: number, locale: Locale = DEFAULT_LOCALE): string {
  if (locale === "en") return `${formatNumber(n, locale)} ${n === 1 ? "job" : "jobs"}`
  return n % 10 === 1 && n % 100 !== 11 ? `${n} oglas` : `${n} oglasa`
}

/** Parse an API timestamp. The DB columns are naive UTC, so most arrive with
 * no zone suffix, which `new Date` would otherwise read as local time. */
export function parseApiDate(iso: string): Date {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`)
}

/** Whole days from now until an API timestamp (negative once it's past). */
export function daysUntil(iso: string): number {
  return Math.ceil((parseApiDate(iso).getTime() - Date.now()) / 86_400_000)
}

/** "17. 10. 2026." / "17 Oct 2026", in Croatian time. */
export function formatDate(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  if (locale === "en") {
    return new Intl.DateTimeFormat(INTL_LOCALE.en, {
      timeZone: "Europe/Zagreb",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(parseApiDate(iso))
  }
  const parts = new Intl.DateTimeFormat("hr-HR", {
    timeZone: "Europe/Zagreb",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(parseApiDate(iso))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("day")}. ${get("month")}. ${get("year")}.`
}

/** "17. 10." / "17 Oct": a date on a job card, where the year is noise. */
export function formatShortDate(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  if (locale === "en") {
    return new Intl.DateTimeFormat(INTL_LOCALE.en, { timeZone: "Europe/Zagreb", day: "numeric", month: "short" }).format(
      parseApiDate(iso),
    )
  }
  return formatDate(iso, locale).replace(/\s*\d{4}\.$/, "")
}

/** HZZ titles arrive in capitals ("PRODAVAČ/PRODAVAČICA"); show those as
 * "Prodavač/prodavačica". Titles in normal case are left alone. */
export function displayTitle(title: string): string {
  const hasLower = title !== title.toUpperCase()
  if (hasLower || !/\p{L}/u.test(title)) return title
  const lower = title.toLocaleLowerCase("hr-HR")
  return lower.charAt(0).toLocaleUpperCase("hr-HR") + lower.slice(1)
}

/** The ad's own salary text, trimmed of markup and of sentences that ran on after it. */
export function cleanSalary(s: string | null): string | null {
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

const PERIOD_SUFFIX: Record<Locale, Record<string, string>> = {
  hr: { hour: "/h", year: "/god." },
  en: { hour: "/h", year: "/yr" },
}

/** "1.100 – 1.500 €", "od 2.000 €", "3 – 4 €/h" (or "€1,100 – €1,500", "from €2,000")
 * from the parsed numbers; falls back to the ad's own text. */
export function salaryAmount(job: Job, locale: Locale = DEFAULT_LOCALE): string | null {
  const { salary_min: lo, salary_max: hi } = job
  if (lo === null) return job.salary_shown ? cleanSalary(job.salary_text) : null
  const period = PERIOD_SUFFIX[locale][job.salary_period ?? ""] ?? ""
  const money = (n: number) => `${euro(n, locale)}${period}`
  const [from, upTo] = locale === "en" ? ["from", "up to"] : ["od", "do"]
  if (job.salary_type === "from" || job.salary_type === "above") return `${from} ${money(lo)}`
  if (job.salary_type === "up_to") return `${upTo} ${money(hi ?? lo)}`
  if (hi === null || hi === lo) return money(lo)
  // Croatian puts the sign once at the end ("1.100 – 1.500 €"); English on both ("€1,100 – €1,500").
  if (locale === "en") return `${money(lo)} – ${money(hi)}`
  return `${formatNumber(Math.round(lo))} – ${formatNumber(Math.round(hi))} €${period}`
}
