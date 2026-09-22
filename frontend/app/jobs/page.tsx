import type { Metadata } from "next"
import JobBrowser from "../../components/job/JobBrowser"
import Stats from "../../components/ui/Stats"
import { getFilters, getJobs, getStats } from "../../lib/api"
import { SITE_URL } from "../../lib/seo"

export const revalidate = 300

export const metadata: Metadata = {
  title: "Svi oglasi za posao s transparentnom plaćom",
  description:
    "Pregledaj sve oglase za posao u Hrvatskoj s vidljivom neto ili bruto plaćom u EUR. Filtriraj po gradu, kategoriji i portalu.",
  alternates: { canonical: `${SITE_URL}/jobs` },
}

async function getJobsPageData() {
  const [stats, jobsRes, filtersRes] = await Promise.all([
    getStats({ revalidate: 300 }),
    getJobs({ page: 1, per_page: 20, salary_shown: "yes", sort: "newest" }, { revalidate: 300 }).catch(() => ({
      jobs: [],
      total: 0,
      page: 1,
      per_page: 20,
    })),
    getFilters({ revalidate: 300 }).catch(() => ({ cities: [], locations: [], categories: [], job_types: [] })),
  ])
  return { stats, jobsRes, filtersRes }
}

export default async function JobsPage() {
  const { stats, jobsRes, filtersRes } = await getJobsPageData()

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

      <JobBrowser
        initialJobs={jobsRes.jobs}
        initialTotal={jobsRes.total}
        initialCities={filtersRes.cities}
        initialLocations={filtersRes.locations}
        initialCategories={filtersRes.categories}
      />
    </main>
  )
}
