export interface Job {
  id: number
  external_id: string | null
  title: string
  company: string | null
  location: string | null
  job_type: string | null
  category: string | null
  salary_min: number | null
  salary_max: number | null
  salary_text: string | null
  salary_shown: boolean
  salary_currency: string | null
  salary_basis: string | null
  salary_type: string | null
  description: string | null
  url: string | null
  source: string | null
  posted_at: string | null
  scraped_at: string | null
  expires_at: string | null
}

export interface JobList {
  total: number
  page: number
  per_page: number
  jobs: Job[]
}

export interface SourceCount {
  source: string
  cnt: number
}

export interface CityCount {
  location: string
  cnt: number
}

export interface MarketEstimate {
  source: string
  estimated_pct: number
}

export interface Stats {
  total: number
  salary_shown: number
  salary_hidden: number
  new_today: number
  salary_shown_pct: number
  market_estimates: MarketEstimate[]
  sources: SourceCount[]
  top_cities: CityCount[]
}

export interface FilterOption {
  value: string
  count: number
}

export interface Filters {
  cities: string[]
  locations: string[]
  categories: string[]
  job_types: string[]
  category_options: FilterOption[]
  region_options: FilterOption[]
  city_options: FilterOption[]
  country_options: FilterOption[]
}

export type JobSort = "newest" | "salary_desc" | "salary_asc"

export interface JobFilters {
  search: string
  category: string
  /** "" (anywhere), "hr" / "foreign" (whole region), "city:<name>" or "country:<name>". */
  location: string
  /** Minimum monthly salary in EUR, "" for no minimum. */
  salaryMin: string
  sort: JobSort
  source: string
}

export const EMPTY_FILTERS: JobFilters = {
  search: "",
  category: "",
  location: "",
  salaryMin: "",
  sort: "newest",
  source: "",
}
