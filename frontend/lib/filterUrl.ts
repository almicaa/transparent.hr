import { JobFilters } from "./types"

// Filters live in the URL (?grana=…&grad=…) so a filtered list can be shared
// or bookmarked, and survives a refresh.
export function filtersFromUrl(params: URLSearchParams): { filters: JobFilters; page: number } {
  const sort = params.get("sort")
  let location = ""
  if (params.get("grad")) location = `city:${params.get("grad")}`
  else if (params.get("drzava")) location = `country:${params.get("drzava")}`
  else if (params.get("inozemstvo")) location = "foreign"
  else if (params.get("hrvatska")) location = "hr"
  return {
    filters: {
      search: params.get("q") ?? "",
      category: params.get("grana") ?? "",
      location,
      salaryMin: params.get("placa") ?? "",
      salaryMax: params.get("placa_do") ?? "",
      sort: sort === "salary_desc" || sort === "salary_asc" ? sort : "newest",
      source: params.get("izvor") ?? "",
      newOnly: params.get("novi") === "1",
    },
    page: Math.max(1, Number(params.get("stranica")) || 1),
  }
}

/** "?grana=…&grad=…" for the given filters, or "" when nothing is set. */
export function filtersToQuery(filters: JobFilters, page = 1): string {
  const params = new URLSearchParams()
  if (filters.search) params.set("q", filters.search)
  if (filters.category) params.set("grana", filters.category)
  if (filters.location.startsWith("city:")) params.set("grad", filters.location.slice(5))
  else if (filters.location.startsWith("country:")) params.set("drzava", filters.location.slice(8))
  else if (filters.location === "foreign") params.set("inozemstvo", "1")
  else if (filters.location === "hr") params.set("hrvatska", "1")
  if (filters.salaryMin) params.set("placa", filters.salaryMin)
  if (filters.salaryMax) params.set("placa_do", filters.salaryMax)
  if (filters.sort !== "newest") params.set("sort", filters.sort)
  if (filters.source) params.set("izvor", filters.source)
  if (filters.newOnly) params.set("novi", "1")
  if (page > 1) params.set("stranica", String(page))
  const qs = params.toString()
  return qs ? `?${qs}` : ""
}
