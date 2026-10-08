/** "1 oglas", "3 oglasa", "11 oglasa", "21 oglas" */
export function jobCountLabel(n: number): string {
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

/** "8. 10. u 04:40" in Croatian time. */
export function formatUpdatedAt(iso: string): string {
  const date = parseApiDate(iso)
  const parts = new Intl.DateTimeFormat("hr-HR", {
    timeZone: "Europe/Zagreb",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("day")}. ${get("month")}. u ${get("hour")}:${get("minute")}`
}

/** "17. 10. 2026." in Croatian time. */
export function formatDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("hr-HR", {
    timeZone: "Europe/Zagreb",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(parseApiDate(iso))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("day")}. ${get("month")}. ${get("year")}.`
}
