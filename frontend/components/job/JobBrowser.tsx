"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Filters from "../filters/Filters"
import JobCard from "./JobCard"
import { getFilters, getJobs, GetJobsParams } from "../../lib/api"
import { EMPTY_FILTERS, Filters as FilterData, Job, JobFilters, JobSort } from "../../lib/types"

const PER_PAGE = 20
const SEARCH_DEBOUNCE_MS = 350

const EMPTY_FILTER_DATA: FilterData = {
  cities: [],
  locations: [],
  categories: [],
  job_types: [],
  category_options: [],
  region_options: [],
  city_options: [],
  country_options: [],
  salary_histogram: [],
}

// Filters live in the URL (?grana=…&grad=…) so a filtered list can be shared
// or bookmarked, and survives a refresh.
function filtersFromUrl(params: URLSearchParams): { filters: JobFilters; page: number } {
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

function filtersToUrl(filters: JobFilters, page: number): string {
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
  return qs ? `?${qs}` : window.location.pathname
}

function toApiParams(filters: JobFilters, search: string, page: number): GetJobsParams {
  const { location } = filters
  return {
    page,
    per_page: PER_PAGE,
    salary_shown: "yes",
    search: search || undefined,
    category: filters.category || undefined,
    city: location.startsWith("city:") ? location.slice(5) : undefined,
    country: location.startsWith("country:") ? location.slice(8) : undefined,
    region: location === "foreign" || location === "hr" ? location : undefined,
    salary_min: filters.salaryMin ? Number(filters.salaryMin) : undefined,
    salary_max: filters.salaryMax ? Number(filters.salaryMax) : undefined,
    sort: filters.sort,
    source: filters.source || undefined,
    new_only: filters.newOnly || undefined,
  }
}

/** Debounced copy of `value`, plus a way to skip the wait (submit button). */
function useDebounced<T>(value: T, delay: number): [T, () => void] {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return [debounced, () => setDebounced(value)]
}

const SORT_LABELS: Record<JobSort, string> = {
  newest: "Najnovije",
  salary_desc: "Najviša plaća",
  salary_asc: "Najniža plaća",
}

interface JobBrowserProps {
  initialJobs?: Job[]
  initialTotal?: number
  initialFilterData?: FilterData
}

export default function JobBrowser({ initialJobs, initialTotal, initialFilterData }: JobBrowserProps = {}) {
  // An empty server result usually means the backend was briefly unreachable
  // when the page was (re)generated, and ISR would keep serving that for the
  // whole revalidate window — so treat it as "no initial data" and fetch here.
  const hasInitialJobs = !!initialJobs?.length
  const [jobs, setJobs] = useState<Job[]>(initialJobs ?? [])
  const [filterData, setFilterData] = useState<FilterData>(initialFilterData ?? EMPTY_FILTER_DATA)
  const [loading, setLoading] = useState(!hasInitialJobs)
  const [filters, setFilters] = useState<JobFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(initialTotal ?? 0)
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PER_PAGE)), [total])

  const [search, flushSearch] = useDebounced(filters.search.trim(), SEARCH_DEBOUNCE_MS)
  const resultsRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  // The server-rendered first page already matches unfiltered state, so the
  // first fetch is skipped; URL filters applied on mount then trigger a real one.
  const skipJobsFetch = useRef(hasInitialJobs)
  const urlReady = useRef(false)

  useEffect(() => {
    const fromUrl = filtersFromUrl(new URLSearchParams(window.location.search))
    if (fromUrl.page !== 1 || JSON.stringify(fromUrl.filters) !== JSON.stringify(EMPTY_FILTERS)) {
      setFilters(fromUrl.filters)
      setPage(fromUrl.page)
    }
    urlReady.current = true
  }, [])

  useEffect(() => {
    if (initialFilterData?.category_options?.length) return
    getFilters()
      .then(setFilterData)
      .catch(() => {})
  }, [initialFilterData])

  useEffect(() => {
    if (urlReady.current) window.history.replaceState(null, "", filtersToUrl(filters, page))
  }, [filters, page])

  useEffect(() => {
    if (skipJobsFetch.current) {
      skipJobsFetch.current = false
      return
    }
    let mounted = true
    setLoading(true)
    getJobs(toApiParams(filters, search, page))
      .then((res) => {
        if (!mounted) return
        setJobs(res.jobs)
        setTotal(res.total)
      })
      .catch((e) => console.error(e))
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
    // filters.search is deliberately left out — the debounced `search` drives fetching.
  }, [page, search, filters.category, filters.location, filters.salaryMin, filters.salaryMax, filters.sort, filters.source, filters.newOnly])

  function updateFilters(patch: Partial<JobFilters>) {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(1)
  }

  function goToPage(next: number) {
    setPage(next)
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="job-browser" ref={topRef}>
      <Filters
        filters={filters}
        onChange={updateFilters}
        onSubmit={() => {
          flushSearch()
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }}
        total={total}
        categoryOptions={filterData.category_options ?? []}
        regionOptions={filterData.region_options ?? []}
        cityOptions={filterData.city_options ?? []}
        countryOptions={filterData.country_options ?? []}
        salaryHistogram={filterData.salary_histogram ?? []}
      />

      <div className="results-head" ref={resultsRef}>
        <h2>
          Rezultati <span className="results-head__count">{loading && jobs.length === 0 ? "…" : `(${total})`}</span>
        </h2>
        <label className="results-head__sort">
          Poredaj po
          <select value={filters.sort} onChange={(e) => updateFilters({ sort: e.target.value as JobSort })}>
            {(Object.keys(SORT_LABELS) as JobSort[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!loading && jobs.length === 0 ? (
        <div className="job-browser__empty">
          <p>Nema oglasa za odabrane filtere.</p>
          <button type="button" className="active-filters__clear" onClick={() => updateFilters(EMPTY_FILTERS)}>
            Očisti filtere
          </button>
        </div>
      ) : (
        <div className={loading ? "grid grid--loading" : "grid"} aria-busy={loading}>
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="pagination">
          <button onClick={() => goToPage(Math.max(1, page - 1))} disabled={page <= 1}>
            Prethodna
          </button>
          <div className="meta">
            Stranica {page} / {totalPages}
          </div>
          <button onClick={() => goToPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
            Sljedeća
          </button>
        </div>
      ) : null}
    </div>
  )
}
