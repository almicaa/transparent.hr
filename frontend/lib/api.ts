import { Filters, Job, JobList, Stats } from "./types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

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
  sort?: "newest" | "salary_desc" | "salary_asc"
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== "all") {
      usp.set(key, String(value))
    }
  }
  const qs = usp.toString()
  return qs ? `?${qs}` : ""
}

export async function getJobs(params: GetJobsParams = {}): Promise<JobList> {
  const qs = buildQuery({ ...params })
  const res = await fetch(`${API_URL}/api/jobs${qs}`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to load jobs: ${res.status}`)
  return res.json()
}

export async function getJob(id: number | string): Promise<Job | null> {
  const res = await fetch(`${API_URL}/api/jobs/${id}`, { cache: "no-store" })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to load job ${id}: ${res.status}`)
  return res.json()
}

export async function getStats(): Promise<Stats | null> {
  try {
    const res = await fetch(`${API_URL}/api/stats`, { cache: "no-store" })
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

export async function getTransparencyStats(): Promise<SalaryStatPoint[]> {
  try {
    const res = await fetch(`${API_URL}/api/analitika/transparency`, { cache: "no-store" })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function getFilters(): Promise<Filters> {
  const res = await fetch(`${API_URL}/api/filters`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to load filters: ${res.status}`)
  return res.json()
}
