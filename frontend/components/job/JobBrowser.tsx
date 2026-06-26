"use client"

import { useEffect, useMemo, useState } from "react"
import Filters from "../filters/Filters"
import JobCard from "./JobCard"
import { getFilters, getJobs } from "../../lib/api"
import { Job, JobFilters } from "../../lib/types"

const PER_PAGE = 21

export default function JobBrowser() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<JobFilters>({ city: "all", category: "all", source: "all", search: "", region: "all" })

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PER_PAGE)), [total])

  useEffect(() => {
    getFilters().then((f) => {
      setCities(f.cities)
      setCategories(f.categories)
    }).catch(() => {})
  }, [])

  useEffect(() => {
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
