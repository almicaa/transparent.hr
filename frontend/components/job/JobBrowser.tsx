"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Filters from "../filters/Filters"
import JobCard from "./JobCard"
import { getFilters, getJobs } from "../../lib/api"
import { Job, JobFilters } from "../../lib/types"

const PER_PAGE = 20

interface JobBrowserProps {
  initialJobs?: Job[]
  initialTotal?: number
  initialCities?: string[]
  initialCategories?: string[]
}

export default function JobBrowser({
  initialJobs,
  initialTotal,
  initialCities,
  initialCategories,
}: JobBrowserProps = {}) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs ?? [])
  const [cities, setCities] = useState<string[]>(initialCities ?? [])
  const [categories, setCategories] = useState<string[]>(initialCategories ?? [])
  const [loading, setLoading] = useState(initialJobs === undefined)
  const [filters, setFilters] = useState<JobFilters>({ city: "all", category: "all", source: "all", search: "", region: "all" })

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(initialTotal ?? 0)
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PER_PAGE)), [total])

  const skipFiltersFetch = useRef(initialCities !== undefined)
  const skipJobsFetch = useRef(initialJobs !== undefined)

  useEffect(() => {
    if (skipFiltersFetch.current) {
      skipFiltersFetch.current = false
      return
    }
    getFilters().then((f) => {
      setCities(f.cities)
      setCategories(f.categories)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (skipJobsFetch.current) {
      skipJobsFetch.current = false
      return
    }
    let mounted = true
    setLoading(true)
    getJobs({
      page,
      per_page: PER_PAGE,
      salary_shown: "yes",
      city: filters.city,
      category: filters.category,
      source: filters.source,
      region: filters.region === "hr" || filters.region === "foreign" ? filters.region : undefined,
      search: filters.search || undefined,
    })
      .then((jobsRes) => {
        if (!mounted) return
        setJobs(jobsRes.jobs)
        setTotal(jobsRes.total)
      })
      .catch((e) => console.error(e))
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [page, filters])

  return (
    <div className="job-browser">
      <Filters filters={filters} setFilters={setFilters} setPage={setPage} cities={cities} categories={categories} />

      <div className="meta" style={{ margin: "16px 0 8px" }}>
        Prikazano {jobs.length} oglasa na stranici (ukupno {total})
      </div>

      {loading ? (
        <p>Učitavanje...</p>
      ) : (
        <div className="grid">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {!loading && jobs.length === 0 && <p>Nema oglasa za odabrane filtere.</p>}

      <div className="pagination">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Prethodna
        </button>
        <div className="meta">
          Stranica {page} / {totalPages}
        </div>
        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
          Sljedeća
        </button>
      </div>
    </div>
  )
}
