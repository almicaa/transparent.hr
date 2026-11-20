import { Locale } from "./i18n"
import { CvMatchResult, Filters, Job, JobList, JobSort, Stats } from "./types"

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

const CV_ERRORS: Record<Locale, { offline: string; failed: string }> = {
  hr: {
    offline: "Nema veze sa serverom. Provjeri internet i pokušaj ponovno.",
    failed: "Nešto je pošlo po zlu. Pokušaj ponovno.",
  },
  en: {
    offline: "Can't reach the server. Check your connection and try again.",
    failed: "Something went wrong. Please try again.",
  },
}

/** Upload a CV (PDF or .docx) and get AI-picked matching jobs, with the AI's
 * notes in `locale`. Throws with a user-facing message in that language on
 * failure. Nothing is stored on the server. */
export async function matchCv(file: File, locale: Locale): Promise<CvMatchResult> {
  const body = new FormData()
  body.append("file", file)
  body.append("lang", locale)
  let res: Response
  try {
    res = await fetch(`${API_URL}/api/cv-match`, { method: "POST", body })
  } catch {
    throw new Error(CV_ERRORS[locale].offline)
  }
  if (!res.ok) {
    const detail = await res
      .json()
      .then((d) => (typeof d?.detail === "string" ? d.detail : null))
      .catch(() => null)
    throw new Error(detail || CV_ERRORS[locale].failed)
  }
  return res.json()
}
