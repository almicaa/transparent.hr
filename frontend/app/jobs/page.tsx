import type { Metadata } from "next"
import JobBrowser from "../../components/job/JobBrowser"
import { getFilters, getJobs, JOBS_PER_PAGE } from "../../lib/api"
import { SITE_URL } from "../../lib/seo"

export const revalidate = 300

export const metadata: Metadata = {
  title: "Svi oglasi za posao s transparentnom plaćom",
  description:
    "Pregledaj sve oglase za posao u Hrvatskoj s vidljivom neto ili bruto plaćom u EUR. Filtriraj po gradu, kategoriji i portalu.",
  alternates: { canonical: `${SITE_URL}/jobs` },
}

async function getJobsPageData() {
  const [jobsRes, filtersRes] = await Promise.all([
    getJobs({ page: 1, per_page: JOBS_PER_PAGE, salary_shown: "yes", sort: "newest" }, { revalidate: 300 }).catch(() => ({
      jobs: [],
      total: 0,
      page: 1,
      per_page: JOBS_PER_PAGE,
    })),
    getFilters({ revalidate: 300 }).catch(() => undefined),
  ])
  return { jobsRes, filtersRes }
}

export default async function JobsPage() {
  const { jobsRes, filtersRes } = await getJobsPageData()

  return (
    <main>
      <JobBrowser
        initialJobs={jobsRes.jobs}
        initialTotal={jobsRes.total}
        initialFilterData={filtersRes}
      />
    </main>
  )
}
