"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { FilterPanel, panelFilterCount, SearchBar } from "../filters/Filters"
import HeroIllustration from "../ui/HeroIllustration"
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

// Filters live in the URL so a filtered list can be shared or bookmarked and
// survives a refresh. Written only on user actions (never from a mount effect,
// which would run before Next patches history). A null state lets Next's
// patched replaceState keep its router in sync with the new URL.
function syncUrl(filters: JobFilters, pages: number) {
  window.history.replaceState(null, "", filtersToQuery(filters, pages) || window.location.pathname)
}

// Opening a job and coming back re-mounts the list, so remember where the
// reader was (per filter URL) and jump back once the same pages are loaded.
const SCROLL_KEY = "jobs-scroll"

function saveScroll() {
  try {
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ url: window.location.search, y: window.scrollY }))
  } catch {}
}

function restoreScroll() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? "null")
    sessionStorage.removeItem(SCROLL_KEY)
    if (saved && saved.url === window.location.search) requestAnimationFrame(() => window.scrollTo(0, saved.y))
  } catch {}
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
  // How many pages of PER_PAGE are loaded; "Prikaži još" appends the next one.
  const [pages, setPages] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [total, setTotal] = useState(initialTotal ?? 0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const [search, flushSearch] = useDebounced(filters.search.trim(), SEARCH_DEBOUNCE_MS)
  const resultsRef = useRef<HTMLDivElement>(null)
  // The server-rendered first page already matches unfiltered state, so the
  // first fetch is skipped; URL filters applied on mount then trigger a real one.
  const skipJobsFetch = useRef(hasInitialJobs)
  // Pages to load in one go — more than 1 only when coming back to a list that
  // had been extended (?stranica=3), until the reader changes a filter.
  const restorePages = useRef(1)
  // Bumped by every filter fetch so a slow "Prikaži još" can't append to a newer list.
  const generation = useRef(0)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const fromUrl = filtersFromUrl(new URLSearchParams(window.location.search))
    if (fromUrl.page !== 1 || JSON.stringify(fromUrl.filters) !== JSON.stringify(EMPTY_FILTERS)) {
      restorePages.current = fromUrl.page
      setFilters(fromUrl.filters)
      setReloadKey((k) => k + 1)
    }
  }, [])

  useEffect(() => {
    if (initialFilterData?.category_options?.length) return
    getFilters()
      .then(setFilterData)
      .catch(() => {})
  }, [initialFilterData])

  useEffect(() => {
    if (skipJobsFetch.current && reloadKey === 0) {
      skipJobsFetch.current = false
      return
    }
    skipJobsFetch.current = false
    const gen = ++generation.current
    const count = restorePages.current
    setLoading(true)
    Promise.all(Array.from({ length: count }, (_, i) => getJobs(toApiParams(filters, search, i + 1))))
      .then((results) => {
        if (gen !== generation.current) return
        setJobs(results.flatMap((r) => r.jobs))
        setTotal(results[0]?.total ?? 0)
        setPages(count)
        restoreScroll()
      })
      .catch((e) => console.error(e))
      .finally(() => {
        if (gen === generation.current) setLoading(false)
      })
    // filters.search is deliberately left out — the debounced `search` drives fetching.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, search, filters.category, filters.location, filters.salaryMin, filters.salaryMax, filters.sort, filters.source, filters.newOnly])

  const drawerCount = panelFilterCount(filters)

  function updateFilters(patch: Partial<JobFilters>) {
    const next = { ...filters, ...patch }
    restorePages.current = 1
    setFilters(next)
    syncUrl(next, 1)
  }

  function loadMore() {
    const gen = generation.current
    const next = pages + 1
    setLoadingMore(true)
    getJobs(toApiParams(filters, search, next))
      .then((res) => {
        if (gen !== generation.current) return
        setJobs((prev) => {
          const seen = new Set(prev.map((j) => j.id))
          return [...prev, ...res.jobs.filter((j) => !seen.has(j.id))]
        })
        setTotal(res.total)
        setPages(next)
        syncUrl(filters, next)
      })
      .catch((e) => console.error(e))
      .finally(() => setLoadingMore(false))
  }

  return (
    <div className="job-browser">
      <section className="jobs-hero hero-surface">
        <HeroIllustration />
        <h1 className="sr-only">Oglasi za posao s transparentnom plaćom</h1>
        <SearchBar
          filters={filters}
          onChange={updateFilters}
          onSubmit={() => {
            flushSearch()
            resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
          }}
          categoryOptions={filterData.category_options ?? []}
          regionOptions={filterData.region_options ?? []}
          cityOptions={filterData.city_options ?? []}
          countryOptions={filterData.country_options ?? []}
        />
      </section>

      <div className="jobs-layout">
        <FilterPanel
          filters={filters}
          onChange={updateFilters}
          drawerOpen={drawerOpen}
          onCloseDrawer={closeDrawer}
          total={total}
          categoryOptions={filterData.category_options ?? []}
          salaryHistogram={filterData.salary_histogram ?? []}
        />

        <div className="jobs-main">
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
            <div className={loading ? "grid grid--loading" : "grid"} aria-busy={loading} onClickCapture={saveScroll}>
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}

          {jobs.length ? (
            <div className="load-more">
              <p className="meta">
                Prikazano {jobs.length.toLocaleString("hr-HR")} od {total.toLocaleString("hr-HR")}
              </p>
              {jobs.length < total ? (
                <button type="button" className="load-more__button" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Učitavanje…" : "Prikaži još oglasa"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
