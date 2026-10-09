"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Filters from "../filters/Filters"
import JobCard from "./JobCard"
import { getFilters, getJobs, GetJobsParams, JOBS_PER_PAGE as PER_PAGE } from "../../lib/api"
import { filtersFromUrl, filtersToQuery } from "../../lib/filterUrl"
import { EMPTY_FILTERS, Filters as FilterData, Job, JobFilters, JobSort } from "../../lib/types"

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

// Lowest-first stays reachable by URL (?sort=salary_asc) but isn't worth a tab.
const SORT_TABS: { value: JobSort; label: string }[] = [
  { value: "newest", label: "Najnovije" },
  { value: "salary_desc", label: "Najviša plaća" },
]

/** "313 oglasa s plaćom" — the adjective phrase agrees with the count. */
function resultsTitle(n: number): string {
  return `${n} ${n % 10 === 1 && n % 100 !== 11 ? "oglas" : "oglasa"} s plaćom`
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
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
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
    if (urlReady.current) window.history.replaceState(null, "", filtersToQuery(filters, page) || window.location.pathname)
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

  const drawerCount = [filters.newOnly, filters.category, filters.salaryMin || filters.salaryMax, filters.source].filter(Boolean).length

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
        drawerOpen={drawerOpen}
        onCloseDrawer={closeDrawer}
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
        <h2>{loading && jobs.length === 0 ? "Učitavanje…" : resultsTitle(total)}</h2>
        <div className="results-head__actions">
          <div className="segmented segmented--compact" role="radiogroup" aria-label="Poredaj po">
            {SORT_TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={filters.sort === t.value}
                className={filters.sort === t.value ? "segmented__option is-selected" : "segmented__option"}
                onClick={() => updateFilters({ sort: t.value })}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button type="button" className="filters-button" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="16" cy="6" r="2" stroke="currentColor" strokeWidth="2" />
              <circle cx="10" cy="12" r="2" stroke="currentColor" strokeWidth="2" />
              <circle cx="18" cy="18" r="2" stroke="currentColor" strokeWidth="2" />
            </svg>
            Filteri
            {drawerCount ? <span className="filters-button__count">{drawerCount}</span> : null}
          </button>
        </div>
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
