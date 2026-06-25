"use client"

import { useEffect, useMemo, useState } from "react"
import Filters from "../../components/filters/Filters"
import JobCard from "../../components/job/JobCard"
import Stats from "../../components/ui/Stats"
import { getFilters, getJobs, getStats } from "../../lib/api"
import { Job, JobFilters, Stats as StatsType } from "../../lib/types"

const PER_PAGE = 21

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [stats, setStats] = useState<StatsType | null>(null)
  const [cities, setCities] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<JobFilters>({ city: "all", category: "all", source: "all", search: "" })

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
    Promise.all([
      getJobs({
        page,
        per_page: PER_PAGE,
        salary_shown: "yes",
        city: filters.city,
        category: filters.category,
        source: filters.source,
        search: filters.search || undefined,
      }),
      getStats(),
    ])
      .then(([jobsRes, statsRes]) => {
        if (!mounted) return
        setJobs(jobsRes.jobs)
        setTotal(jobsRes.total)
        setStats(statsRes)
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
    <main>
      <div className="site-header">
        <div className="title-block">
          <h1>Transparent.hr</h1>
          <p>Svi oglasi s transparentnom plaćom na jednom mjestu</p>
        </div>
        <Stats
          total={stats?.total ?? 0}
          totalWithSalary={stats?.salary_shown ?? 0}
          portals={stats?.sources?.length ?? 0}
        />
      </div>

      <div className="jobs-layout">
        <Filters filters={filters} setFilters={setFilters} setPage={setPage} cities={cities} categories={categories} />

        <div>
          <div className="meta" style={{ marginBottom: 8 }}>
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
      </div>
    </main>
  )
}
