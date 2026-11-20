import JobBrowser from "../../../components/job/JobBrowser"
import { getFilters, getJobs, JOBS_PER_PAGE } from "../../../lib/api"
import { LangProps } from "../../../lib/i18n"
import { pageMetadata } from "../../../lib/seo"

export const revalidate = 300

const META = {
  hr: {
    title: "Svi oglasi za posao s plaćom",
    description:
      "Pregledaj sve oglase za posao u Hrvatskoj s vidljivom neto ili bruto plaćom u EUR. Filtriraj po gradu, kategoriji i portalu.",
  },
  en: {
    title: "All jobs in Croatia with the salary listed",
    description:
      "Browse every job in Croatia that shows its net or gross pay in euros. Filter by city, sector and job site.",
  },
}

export function generateMetadata({ params }: LangProps) {
  return pageMetadata({ locale: params.lang, ...META[params.lang], path: "/jobs" })
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
      <JobBrowser initialJobs={jobsRes.jobs} initialTotal={jobsRes.total} initialFilterData={filtersRes} />
    </main>
  )
}
