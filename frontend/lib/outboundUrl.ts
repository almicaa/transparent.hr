// Tag links to the source portals so their analytics credit the visit to us.
// Added when rendering, not stored: the DB keeps the portal's own URL, which
// the scrapers dedupe and backfill on. Existing parameters stay (HZZ ads are
// identified by ?WebSifra=…).
export function outboundUrl(href: string): string {
  try {
    const url = new URL(href)
    url.searchParams.set("utm_source", "transparent.hr")
    url.searchParams.set("utm_medium", "referral")
    return url.toString()
  } catch {
    return href
  }
}
