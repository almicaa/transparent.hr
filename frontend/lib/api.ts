import { Filters, Job, JobList, JobSort, Stats } from "./types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

/** Job cards per page: a multiple of 3 so the desktop grid has no ragged last row. */
export const JOBS_PER_PAGE = 21

export interface GetJobsParams {
  page?: number
  per_page?: number
  salary_shown?: "yes" | "no"
  salary_min?: number
  salary_max?: number
  city?: string
  category?: string
  job_type?: string
  source?: string
  company?: string
  search?: string
  region?: "hr" | "foreign"
  country?: string
  new_only?: boolean
  sort?: JobSort
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const usp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== "all") {
      usp.set(key, String(value))
    }
  }
  const qs = usp.toString()
  return qs ? `?${qs}` : ""
}

interface FetchOptions {
  /** When set, uses Next's data cache with this revalidate window instead of "no-store". */
  revalidate?: number
}

function cacheInit({ revalidate }: FetchOptions = {}): RequestInit {
  return revalidate !== undefined ? { next: { revalidate } } : { cache: "no-store" }
}

export async function getJobs(params: GetJobsParams = {}, opts: FetchOptions = {}): Promise<JobList> {
  const qs = buildQuery({ ...params })
  const res = await fetch(`${API_URL}/api/jobs${qs}`, cacheInit(opts))
  if (!res.ok) throw new Error(`Failed to load jobs: ${res.status}`)
  return res.json()
}

export async function getJob(id: number | string, opts: FetchOptions = {}): Promise<Job | null> {
  const res = await fetch(`${API_URL}/api/jobs/${id}`, cacheInit(opts))
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to load job ${id}: ${res.status}`)
  return res.json()
}

export async function getStats(opts: FetchOptions = {}): Promise<Stats | null> {
  try {
    const res = await fetch(`${API_URL}/api/stats`, cacheInit(opts))
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export interface SalaryStatPoint {
  source: string
  date: string
  total_jobs: number
  jobs_with_salary: number
  pct: number
}

export async function getTransparencyStats(opts: FetchOptions = {}): Promise<SalaryStatPoint[]> {
  try {
    const res = await fetch(`${API_URL}/api/analitika/transparency`, cacheInit(opts))
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function getFilters(opts: FetchOptions = {}): Promise<Filters> {
  const res = await fetch(`${API_URL}/api/filters`, cacheInit(opts))
  if (!res.ok) throw new Error(`Failed to load filters: ${res.status}`)
  return res.json()
}
